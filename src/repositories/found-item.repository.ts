import { ObjectId, type Document, type Filter } from "mongodb";
import { COLLECTIONS, getCollection } from "@/lib/mongodb";
import type { ClaimDocument } from "@/types/claim";
import type {
  FoundItemDetailDTO,
  FoundItemDocument,
  FoundItemSummaryDTO,
  ItemCommentDTO,
  ItemCommentDocument,
  ItemListFilters,
  NewFoundItemDocument,
  StoredImage,
} from "@/types/found-item";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toObjectId(id: string | ObjectId): ObjectId | null {
  if (typeof id === "string") {
    if (!ObjectId.isValid(id)) return null;
    return new ObjectId(id);
  }
  return id;
}

export function toItemCommentDTO(comment: ItemCommentDocument): ItemCommentDTO {
  return {
    id: comment._id.toHexString(),
    authorId: comment.authorId.toHexString(),
    authorName: comment.authorName,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

interface AggregatedSummaryRow extends FoundItemDocument {
  publisherName?: string;
  zoneCode?: string;
  zoneName?: string;
}

export interface FoundItemDetailRecord extends AggregatedSummaryRow {
  publisherContactPhone?: string;
}

function mapSummaryRow(row: AggregatedSummaryRow): FoundItemSummaryDTO {
  return {
    id: row._id.toHexString(),
    publisherId: row.publisherId.toHexString(),
    publisherName: row.publisherName ?? "Estudiante",
    zoneId: row.zoneId.toHexString(),
    zoneCode: row.zoneCode ?? "",
    zoneName: row.zoneName ?? "Zona desconocida",
    title: row.title,
    description: row.description,
    category: row.category,
    customCategory: row.customCategory ?? null,
    status: row.status,
    location: row.location,
    custody: row.custody,
    tags: row.tags ?? [],
    images: row.images ?? [],
    commentsCount: row.comments?.length ?? 0,
    foundAt: row.foundAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapDetailRecordToDTO(
  record: FoundItemDetailRecord,
  revealContactPhone: boolean,
): FoundItemDetailDTO {
  return {
    ...mapSummaryRow(record),
    delivery: {
      approvedClaimId: record.delivery.approvedClaimId
        ? record.delivery.approvedClaimId.toHexString()
        : null,
      returnedAt: record.delivery.returnedAt
        ? record.delivery.returnedAt.toISOString()
        : null,
    },
    comments: (record.comments ?? []).map(toItemCommentDTO),
    publisherContactPhone: revealContactPhone
      ? (record.publisherContactPhone ?? null)
      : null,
  };
}

export async function findItemById(
  id: string | ObjectId,
): Promise<FoundItemDocument | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  return collection.findOne({ _id: objectId });
}

export async function findItemDetailById(
  id: string | ObjectId,
): Promise<FoundItemDetailRecord | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );

  const pipeline: Document[] = [
    { $match: { _id: objectId } },
    {
      $lookup: {
        from: COLLECTIONS.users,
        localField: "publisherId",
        foreignField: "_id",
        pipeline: [{ $project: { fullName: 1, contactPhone: 1 } }],
        as: "_publisher",
      },
    },
    {
      $lookup: {
        from: COLLECTIONS.campusZones,
        localField: "zoneId",
        foreignField: "_id",
        pipeline: [{ $project: { code: 1, name: 1 } }],
        as: "_zone",
      },
    },
    {
      $addFields: {
        publisherName: {
          $ifNull: [{ $arrayElemAt: ["$_publisher.fullName", 0] }, "Estudiante"],
        },
        publisherContactPhone: {
          $ifNull: [{ $arrayElemAt: ["$_publisher.contactPhone", 0] }, null],
        },
        zoneCode: {
          $ifNull: [{ $arrayElemAt: ["$_zone.code", 0] }, ""],
        },
        zoneName: {
          $ifNull: [
            { $arrayElemAt: ["$_zone.name", 0] },
            "Zona desconocida",
          ],
        },
      },
    },
    { $project: { _publisher: 0, _zone: 0 } },
  ];

  const rows = await collection
    .aggregate<FoundItemDetailRecord>(pipeline)
    .toArray();
  return rows[0] ?? null;
}

export async function createFoundItem(
  data: NewFoundItemDocument,
  forcedId?: ObjectId,
): Promise<FoundItemDocument> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );

  const docToInsert: FoundItemDocument = {
    _id: forcedId ?? new ObjectId(),
    ...data,
  };

  await collection.insertOne(docToInsert);
  return docToInsert;
}

export async function listFoundItems(filters: ItemListFilters): Promise<{
  items: FoundItemSummaryDTO[];
  total: number;
  page: number;
  limit: number;
}> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );

  const match: Filter<FoundItemDocument> = {};

  if (filters.query) {
    match.$text = { $search: filters.query };
  }

  if (filters.category) {
    match.category = filters.category;
  }

  if (filters.zoneId && ObjectId.isValid(filters.zoneId)) {
    match.zoneId = new ObjectId(filters.zoneId);
  }

  if (filters.status) {
    match.status = filters.status;
  }

  if (filters.tag) {
    match.tags = {
      $regex: new RegExp(`^${escapeRegex(filters.tag)}$`, "i"),
    } as unknown as string[];
  }

  if (filters.from || filters.to) {
    const foundAtFilter: Record<string, Date> = {};
    if (filters.from) foundAtFilter.$gte = filters.from;
    if (filters.to) foundAtFilter.$lte = filters.to;
    match.foundAt = foundAtFilter as unknown as Date;
  }

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 12));
  const skip = (page - 1) * limit;

  const sortStage: Document = filters.query
    ? { score: { $meta: "textScore" }, createdAt: -1 }
    : { createdAt: -1 };

  const pipeline: Document[] = [
    { $match: match },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: sortStage },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: COLLECTIONS.users,
              localField: "publisherId",
              foreignField: "_id",
              pipeline: [{ $project: { fullName: 1 } }],
              as: "_publisher",
            },
          },
          {
            $lookup: {
              from: COLLECTIONS.campusZones,
              localField: "zoneId",
              foreignField: "_id",
              pipeline: [{ $project: { code: 1, name: 1 } }],
              as: "_zone",
            },
          },
          {
            $addFields: {
              publisherName: {
                $ifNull: [
                  { $arrayElemAt: ["$_publisher.fullName", 0] },
                  "Estudiante",
                ],
              },
              zoneCode: {
                $ifNull: [{ $arrayElemAt: ["$_zone.code", 0] }, ""],
              },
              zoneName: {
                $ifNull: [
                  { $arrayElemAt: ["$_zone.name", 0] },
                  "Zona desconocida",
                ],
              },
            },
          },
          { $project: { _publisher: 0, _zone: 0 } },
        ],
      },
    },
  ];

  const [result] = await collection
    .aggregate<{
      metadata: Array<{ total: number }>;
      data: AggregatedSummaryRow[];
    }>(pipeline)
    .toArray();

  const total = result?.metadata[0]?.total ?? 0;
  const items = (result?.data ?? []).map(mapSummaryRow);

  return { items, total, page, limit };
}

export async function updateItemFields(
  id: ObjectId,
  setFields: Record<string, unknown>,
): Promise<boolean> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const result = await collection.updateOne(
    { _id: id },
    { $set: { ...setFields, updatedAt: new Date() } },
  );
  return result.matchedCount > 0;
}

export async function pullItemImages(
  id: ObjectId,
  keys: string[],
): Promise<boolean> {
  if (keys.length === 0) return true;
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const result = await collection.updateOne(
    { _id: id },
    {
      $pull: { images: { key: { $in: keys } } },
      $set: { updatedAt: new Date() },
    },
  );
  return result.matchedCount > 0;
}

export async function pushItemImages(
  id: ObjectId,
  images: StoredImage[],
): Promise<boolean> {
  if (images.length === 0) return true;
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const result = await collection.updateOne(
    { _id: id },
    {
      $push: { images: { $each: images } },
      $set: { updatedAt: new Date() },
    },
  );
  return result.matchedCount > 0;
}

export async function pullItemTags(
  id: ObjectId,
  tags: string[],
): Promise<boolean> {
  if (tags.length === 0) return true;
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const result = await collection.updateOne(
    { _id: id },
    {
      $pull: { tags: { $in: tags } },
      $set: { updatedAt: new Date() },
    },
  );
  return result.matchedCount > 0;
}

export async function pushItemTags(
  id: ObjectId,
  tags: string[],
): Promise<boolean> {
  if (tags.length === 0) return true;
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const result = await collection.updateOne(
    { _id: id },
    {
      $addToSet: { tags: { $each: tags } },
      $set: { updatedAt: new Date() },
    },
  );
  return result.matchedCount > 0;
}

export async function deleteItemById(id: ObjectId): Promise<boolean> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const result = await collection.deleteOne({ _id: id });
  return result.deletedCount > 0;
}

export async function addItemComment(
  postId: ObjectId,
  comment: ItemCommentDocument,
): Promise<boolean> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const result = await collection.updateOne(
    { _id: postId },
    {
      $push: { comments: comment },
      $set: { updatedAt: comment.createdAt },
    },
  );
  return result.matchedCount > 0;
}

export async function removeItemComment(
  postId: ObjectId,
  commentId: ObjectId,
  authorId: ObjectId,
): Promise<boolean> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const result = await collection.updateOne(
    { _id: postId },
    {
      $pull: { comments: { _id: commentId, authorId } },
      $set: { updatedAt: new Date() },
    },
  );
  return result.modifiedCount > 0;
}

export async function transitionItemToInClaim(
  postId: ObjectId,
  approvedClaimId: ObjectId,
  now: Date,
): Promise<FoundItemDocument | null> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  return collection.findOneAndUpdate(
    { _id: postId, status: "disponible" },
    {
      $set: {
        status: "en_reclamo",
        "delivery.approvedClaimId": approvedClaimId,
        "delivery.returnedAt": null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
}

export async function transitionItemToReturned(
  postId: ObjectId,
  now: Date,
): Promise<FoundItemDocument | null> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  return collection.findOneAndUpdate(
    { _id: postId, status: "en_reclamo" },
    {
      $set: {
        status: "devuelto",
        "delivery.returnedAt": now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
}

export async function revertItemToAvailable(
  postId: ObjectId,
  now: Date,
): Promise<FoundItemDocument | null> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  return collection.findOneAndUpdate(
    { _id: postId, status: "en_reclamo" },
    {
      $set: {
        status: "disponible",
        "delivery.approvedClaimId": null,
        "delivery.returnedAt": null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
}

/** Verifica si un usuario tiene un reclamo aprobado para la publicación (RNF-02). */
export async function hasApprovedClaimForUser(
  postId: ObjectId,
  claimantId: ObjectId,
): Promise<boolean> {
  const claims = await getCollection<ClaimDocument>(COLLECTIONS.claims);
  const found = await claims.findOne(
    { postId, claimantId, status: "approved" },
    { projection: { _id: 1 } },
  );
  return Boolean(found);
}

/** Cuenta reclamos activos (pending o approved) antes de permitir borrado (RF-05.2). */
export async function countActiveClaimsByPostId(
  postId: ObjectId,
): Promise<number> {
  const claims = await getCollection<ClaimDocument>(COLLECTIONS.claims);
  return claims.countDocuments({
    postId,
    status: { $in: ["pending", "approved"] },
  });
}

/** Elimina reclamos inactivos de una publicación y devuelve sus keys de evidencia para limpiar S3/R2. */
export async function deleteClaimsByPostId(
  postId: ObjectId,
): Promise<string[]> {
  const claims = await getCollection<ClaimDocument>(COLLECTIONS.claims);
  const existing = await claims
    .find({ postId }, { projection: { "evidenceImage.key": 1 } })
    .toArray();

  const evidenceKeys = existing
    .map((c) => c.evidenceImage?.key)
    .filter((key): key is string => Boolean(key));

  await claims.deleteMany({ postId });
  return evidenceKeys;
}

export const foundItemRepository = {
  findById: findItemById,
  findDetailById: findItemDetailById,
  create: createFoundItem,
  list: listFoundItems,
  updateFields: updateItemFields,
  pullImages: pullItemImages,
  pushImages: pushItemImages,
  pullTags: pullItemTags,
  pushTags: pushItemTags,
  deleteById: deleteItemById,
  addComment: addItemComment,
  removeComment: removeItemComment,
  transitionToInClaim: transitionItemToInClaim,
  transitionToReturned: transitionItemToReturned,
  revertToAvailable: revertItemToAvailable,
  hasApprovedClaimForUser,
  countActiveClaimsByPostId,
  deleteClaimsByPostId,
};
