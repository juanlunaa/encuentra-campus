import type { Document, IndexSpecification, CreateIndexesOptions } from "mongodb";
import {
  COLLECTIONS,
  closeMongoClient,
  getDb,
  type CollectionName,
} from "../src/lib/mongodb.ts";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  CLAIM_STATUSES,
  CUSTODY_MODES,
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_ITEM_IMAGES,
} from "../src/lib/catalogs.ts";

const storedImageSchema: Document = {
  bsonType: "object",
  required: ["url", "key", "mimeType", "sizeBytes"],
  additionalProperties: false,
  properties: {
    url: { bsonType: "string", minLength: 1 },
    key: { bsonType: "string", minLength: 1 },
    mimeType: {
      bsonType: "string",
      enum: [...ALLOWED_IMAGE_MIME_TYPES],
    },
    sizeBytes: {
      bsonType: ["int", "long", "double"],
      minimum: 1,
      maximum: MAX_IMAGE_SIZE_BYTES,
    },
  },
};

const schemas: Record<CollectionName, Document> = {
  [COLLECTIONS.users]: {
    bsonType: "object",
    required: [
      "fullName",
      "email",
      "passwordHash",
      "program",
      "contactPhone",
      "createdAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      fullName: { bsonType: "string", minLength: 2 },
      email: { bsonType: "string", minLength: 5 },
      passwordHash: { bsonType: "string", minLength: 10 },
      program: { bsonType: "string", minLength: 2 },
      contactPhone: { bsonType: "string", minLength: 5 },
      createdAt: { bsonType: "date" },
    },
  },

  [COLLECTIONS.campusZones]: {
    bsonType: "object",
    required: ["campusName", "code", "name", "floors", "isActive"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      campusName: { bsonType: "string", minLength: 2 },
      code: { bsonType: "string", minLength: 2 },
      name: { bsonType: "string", minLength: 2 },
      description: { bsonType: "string" },
      floors: {
        bsonType: "array",
        minItems: 1,
        items: { bsonType: "string", minLength: 1 },
      },
      landmarks: {
        bsonType: "array",
        items: { bsonType: "string", minLength: 1 },
      },
      isActive: { bsonType: "bool" },
    },
  },

  [COLLECTIONS.foundItems]: {
    bsonType: "object",
    required: [
      "publisherId",
      "zoneId",
      "title",
      "description",
      "category",
      "status",
      "location",
      "custody",
      "delivery",
      "tags",
      "images",
      "comments",
      "foundAt",
      "createdAt",
      "updatedAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      publisherId: { bsonType: "objectId" },
      zoneId: { bsonType: "objectId" },
      title: { bsonType: "string", minLength: 3 },
      description: { bsonType: "string", minLength: 5 },
      category: {
        bsonType: "string",
        enum: [...ITEM_CATEGORIES],
      },
      customCategory: { bsonType: ["string", "null"] },
      status: {
        bsonType: "string",
        enum: [...ITEM_STATUSES],
      },
      location: {
        bsonType: "object",
        required: ["floor", "roomOrDetail"],
        additionalProperties: false,
        properties: {
          floor: { bsonType: "string", minLength: 1 },
          roomOrDetail: { bsonType: "string", minLength: 1 },
        },
      },
      custody: {
        bsonType: "object",
        required: ["mode", "verificationQuestion", "safePointName"],
        additionalProperties: false,
        properties: {
          mode: {
            bsonType: "string",
            enum: [...CUSTODY_MODES],
          },
          verificationQuestion: { bsonType: ["string", "null"] },
          safePointName: { bsonType: ["string", "null"] },
        },
      },
      delivery: {
        bsonType: "object",
        required: ["approvedClaimId", "returnedAt"],
        additionalProperties: false,
        properties: {
          approvedClaimId: { bsonType: ["objectId", "null"] },
          returnedAt: { bsonType: ["date", "null"] },
        },
      },
      tags: {
        bsonType: "array",
        items: { bsonType: "string", minLength: 1 },
      },
      images: {
        bsonType: "array",
        maxItems: MAX_ITEM_IMAGES,
        items: storedImageSchema,
      },
      comments: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["_id", "authorId", "authorName", "body", "createdAt"],
          additionalProperties: false,
          properties: {
            _id: { bsonType: "objectId" },
            authorId: { bsonType: "objectId" },
            authorName: { bsonType: "string", minLength: 1 },
            body: { bsonType: "string", minLength: 1 },
            createdAt: { bsonType: "date" },
          },
        },
      },
      foundAt: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },

  [COLLECTIONS.claims]: {
    bsonType: "object",
    required: [
      "postId",
      "claimantId",
      "verificationAnswer",
      "status",
      "createdAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      postId: { bsonType: "objectId" },
      claimantId: { bsonType: "objectId" },
      verificationAnswer: { bsonType: "string", minLength: 3 },
      evidenceImage: {
        bsonType: ["object", "null"],
        required: ["url", "key", "mimeType", "sizeBytes"],
        additionalProperties: false,
        properties: storedImageSchema.properties,
      },
      status: {
        bsonType: "string",
        enum: [...CLAIM_STATUSES],
      },
      resolutionReason: { bsonType: ["string", "null"] },
      createdAt: { bsonType: "date" },
      resolvedAt: { bsonType: ["date", "null"] },
    },
  },
};

interface IndexDefinition {
  collection: CollectionName;
  spec: IndexSpecification;
  options: CreateIndexesOptions;
}

const indexDefinitions: IndexDefinition[] = [
  {
    collection: COLLECTIONS.users,
    spec: { email: 1 },
    options: { unique: true, name: "idx_users_email_unique" },
  },
  {
    collection: COLLECTIONS.campusZones,
    spec: { code: 1 },
    options: { unique: true, name: "idx_campus_zones_code_unique" },
  },
  {
    collection: COLLECTIONS.foundItems,
    spec: { status: 1, createdAt: -1 },
    options: { name: "idx_found_items_status_createdAt" },
  },
  {
    collection: COLLECTIONS.foundItems,
    spec: { zoneId: 1, foundAt: -1 },
    options: { name: "idx_found_items_zoneId_foundAt" },
  },
  {
    collection: COLLECTIONS.foundItems,
    spec: { category: 1, status: 1 },
    options: { name: "idx_found_items_category_status" },
  },
  {
    collection: COLLECTIONS.foundItems,
    spec: { title: "text", description: "text", tags: "text" },
    options: {
      name: "idx_found_items_text_search",
      default_language: "spanish",
    },
  },
  {
    collection: COLLECTIONS.foundItems,
    spec: { publisherId: 1, createdAt: -1 },
    options: { name: "idx_found_items_publisherId_createdAt" },
  },
  {
    collection: COLLECTIONS.claims,
    spec: { postId: 1, status: 1 },
    options: { name: "idx_claims_postId_status" },
  },
  {
    collection: COLLECTIONS.claims,
    spec: { claimantId: 1, createdAt: -1 },
    options: { name: "idx_claims_claimantId_createdAt" },
  },
  {
    collection: COLLECTIONS.claims,
    spec: { postId: 1, claimantId: 1 },
    options: {
      unique: true,
      partialFilterExpression: { status: "pending" },
      name: "idx_claims_unique_pending_per_user",
    },
  },
];

async function setupDatabase(): Promise<void> {
  const db = await getDb();
  const existingCollections = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      (col) => col.name,
    ),
  );

  for (const [collectionName, jsonSchema] of Object.entries(schemas) as [
    CollectionName,
    Document,
  ][]) {
    if (!existingCollections.has(collectionName)) {
      await db.createCollection(collectionName, {
        validator: { $jsonSchema: jsonSchema },
        validationLevel: "strict",
        validationAction: "error",
      });
      console.log(`✓ Colección creada con $jsonSchema estricto: ${collectionName}`);
    } else {
      await db.command({
        collMod: collectionName,
        validator: { $jsonSchema: jsonSchema },
        validationLevel: "strict",
        validationAction: "error",
      });
      console.log(`✓ Validador $jsonSchema actualizado (idempotente): ${collectionName}`);
    }
  }

  for (const { collection, spec, options } of indexDefinitions) {
    const indexName = await db.collection(collection).createIndex(spec, options);
    console.log(`✓ Índice asegurado en ${collection}: ${indexName}`);
  }

  console.log("\nConfiguración de base de datos finalizada correctamente.");
}

setupDatabase()
  .catch((error) => {
    console.error("Error configurando la base de datos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
