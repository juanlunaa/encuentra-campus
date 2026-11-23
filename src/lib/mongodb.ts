import {
  MongoClient,
  type Collection,
  type Db,
  type Document,
  type MongoClientOptions,
} from "mongodb";

export const COLLECTIONS = {
  users: "users",
  campusZones: "campus_zones",
  foundItems: "found_items",
  claims: "claims",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

const DEFAULT_DB_NAME = "encuentra_campus";

const clientOptions: MongoClientOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10_000,
};

declare global {
  var __encuentraCampusMongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error(
      "Falta la variable de entorno MONGODB_URI. Configúrala en .env.local antes de conectar a MongoDB Atlas.",
    );
  }
  return uri;
}

export function getMongoDbName(): string {
  return process.env.MONGODB_DB_NAME?.trim() || DEFAULT_DB_NAME;
}

export function getMongoClient(): Promise<MongoClient> {
  if (!globalThis.__encuentraCampusMongoClientPromise) {
    const client = new MongoClient(getMongoUri(), clientOptions);
    globalThis.__encuentraCampusMongoClientPromise = client
      .connect()
      .catch((error) => {
        globalThis.__encuentraCampusMongoClientPromise = undefined;
        throw error;
      });
  }
  return globalThis.__encuentraCampusMongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getMongoDbName());
}

export async function getCollection<T extends Document = Document>(
  name: CollectionName,
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

export async function pingDatabase(): Promise<{ ok: number }> {
  const db = await getDb();
  const result = await db.command({ ping: 1 });
  return { ok: Number(result.ok ?? 0) };
}

export async function closeMongoClient(): Promise<void> {
  if (globalThis.__encuentraCampusMongoClientPromise) {
    const client = await globalThis.__encuentraCampusMongoClientPromise;
    await client.close();
    globalThis.__encuentraCampusMongoClientPromise = undefined;
  }
}
