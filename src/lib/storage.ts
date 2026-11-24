import crypto from "node:crypto";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  type AllowedImageMimeType,
} from "./catalogs.ts";
import {
  ExternalServiceError,
  PayloadTooLargeError,
  ValidationError,
} from "./errors.ts";
import type { StoredImage } from "../types/found-item.ts";

export type StorageFolder = "items" | "claims";

export interface ImageUploadInput {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
}

const MIME_TO_EXTENSION: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

interface StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
}

declare global {
  var __encuentraCampusS3Client: S3Client | undefined;
}

function getStorageConfig(): StorageConfig {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const region = process.env.S3_REGION?.trim() || "auto";

  const missing: string[] = [];
  if (!bucket) missing.push("S3_BUCKET");
  if (!accessKeyId) missing.push("S3_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("S3_SECRET_ACCESS_KEY");
  if (!publicBaseUrl) missing.push("S3_PUBLIC_BASE_URL");

  if (missing.length > 0) {
    throw new ExternalServiceError(
      `El almacenamiento de imágenes no está configurado correctamente (faltan: ${missing.join(", ")}).`,
    );
  }

  return {
    endpoint,
    region,
    bucket: bucket!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    publicBaseUrl: publicBaseUrl!.replace(/\/+$/, ""),
  };
}

function getS3Client(): { client: S3Client; config: StorageConfig } {
  const config = getStorageConfig();

  if (!globalThis.__encuentraCampusS3Client) {
    globalThis.__encuentraCampusS3Client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: Boolean(config.endpoint),
    });
  }

  return { client: globalThis.__encuentraCampusS3Client, config };
}

function isAllowedMimeType(mimeType: string): mimeType is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
}

function matchesImageSignature(
  buffer: Buffer,
  mimeType: AllowedImageMimeType,
): boolean {
  if (mimeType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

export function validateImageMetadata(file: {
  name: string;
  type: string;
  size: number;
}): AllowedImageMimeType {
  const label = file.name || "imagen";

  if (!isAllowedMimeType(file.type)) {
    throw new ValidationError(
      `El archivo "${label}" tiene un formato no permitido. Solo se aceptan imágenes JPG, PNG o WebP.`,
    );
  }

  if (file.size <= 0) {
    throw new ValidationError(
      `El archivo "${label}" está vacío y no puede subirse.`,
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new PayloadTooLargeError(
      `El archivo "${label}" supera el tamaño máximo permitido de 5 MB.`,
    );
  }

  return file.type;
}

async function normalizeUploadInput(
  file: File | ImageUploadInput,
): Promise<{
  name: string;
  mimeType: AllowedImageMimeType;
  sizeBytes: number;
  buffer: Buffer;
}> {
  const mimeType = validateImageMetadata(file);

  const buffer =
    "buffer" in file
      ? file.buffer
      : Buffer.from(await file.arrayBuffer());

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new PayloadTooLargeError(
      `El archivo "${file.name || "imagen"}" supera el tamaño máximo permitido de 5 MB.`,
    );
  }

  if (!matchesImageSignature(buffer, mimeType)) {
    throw new ValidationError(
      `El contenido del archivo "${file.name || "imagen"}" no corresponde a una imagen ${mimeType.replace("image/", "").toUpperCase()} válida.`,
    );
  }

  return {
    name: file.name || "imagen",
    mimeType,
    sizeBytes: buffer.length,
    buffer,
  };
}

export function validateImageBatch(
  files: Array<{ name: string; type: string; size: number }>,
  maxCount: number,
): void {
  if (files.length > maxCount) {
    throw new ValidationError(
      `Solo puedes adjuntar un máximo de ${maxCount} ${maxCount === 1 ? "imagen" : "imágenes"}.`,
    );
  }

  for (const file of files) {
    validateImageMetadata(file);
  }
}

function buildObjectKey(
  folder: StorageFolder,
  mimeType: AllowedImageMimeType,
  entityId?: string,
): string {
  const extension = MIME_TO_EXTENSION[mimeType];
  const safeEntity = entityId?.replace(/[^a-zA-Z0-9_-]/g, "") || "general";
  return `${folder}/${safeEntity}/${crypto.randomUUID()}.${extension}`;
}

export async function uploadImage(
  file: File | ImageUploadInput,
  folder: StorageFolder,
  entityId?: string,
): Promise<StoredImage> {
  const normalized = await normalizeUploadInput(file);
  const { client, config } = getS3Client();
  const key = buildObjectKey(folder, normalized.mimeType, entityId);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: normalized.buffer,
        ContentType: normalized.mimeType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    console.error("[Storage Upload Error]", error);
    throw new ExternalServiceError(
      `No se pudo subir la imagen "${normalized.name}". Intenta nuevamente.`,
    );
  }

  return {
    url: `${config.publicBaseUrl}/${key}`,
    key,
    mimeType: normalized.mimeType,
    sizeBytes: normalized.sizeBytes,
  };
}

export async function deleteImageByKey(key: string): Promise<void> {
  if (!key) return;
  const { client, config } = getS3Client();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
  } catch (error) {
    console.error(`[Storage Delete Error] key=${key}`, error);
    throw new ExternalServiceError(
      "No se pudo eliminar una imagen del almacenamiento externo.",
    );
  }
}

export async function deleteImagesByKeys(keys: string[]): Promise<void> {
  const validKeys = keys.filter(Boolean);
  if (validKeys.length === 0) return;

  const results = await Promise.allSettled(
    validKeys.map((key) => deleteImageByKey(key)),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error(
      `[Storage Cleanup Warning] ${failed.length} de ${validKeys.length} imágenes no pudieron eliminarse.`,
    );
  }
}

export async function uploadImagesWithRollback(
  files: Array<File | ImageUploadInput>,
  folder: StorageFolder,
  maxCount: number,
  entityId?: string,
): Promise<StoredImage[]> {
  validateImageBatch(files, maxCount);

  if (files.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    files.map((file) => uploadImage(file, folder, entityId)),
  );

  const uploaded: StoredImage[] = [];
  let firstError: unknown = null;

  for (const result of results) {
    if (result.status === "fulfilled") {
      uploaded.push(result.value);
    } else if (firstError === null) {
      firstError = result.reason;
    }
  }

  if (firstError !== null) {
    if (uploaded.length > 0) {
      await deleteImagesByKeys(uploaded.map((img) => img.key));
    }
    throw firstError;
  }

  return uploaded;
}
