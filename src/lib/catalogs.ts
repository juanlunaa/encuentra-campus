export const CAMPUS_NAME = "Tecnológico Comfenalco - Sede B Cedesarrollo";

export const OTHER_CATEGORY = "Otra" as const;

export const ITEM_CATEGORIES = [
  "Electrónica",
  "Documentos y Carnés",
  "Llaves",
  "Accesorios y Ropa",
  "Libros y Útiles",
  "Morrales y Cartucheras",
  OTHER_CATEGORY,
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const ITEM_STATUSES = [
  "disponible",
  "en_custodia_campus",
  "en_reclamo",
  "devuelto",
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  disponible: "Disponible",
  en_custodia_campus: "En custodia del campus",
  en_reclamo: "En reclamo",
  devuelto: "Devuelto",
};

export const CUSTODY_MODES = ["personal", "campus_safe_point"] as const;

export type CustodyMode = (typeof CUSTODY_MODES)[number];

export const CUSTODY_MODE_LABELS: Record<CustodyMode, string> = {
  personal: "Custodia personal",
  campus_safe_point: "Entregado en punto seguro del campus",
};

export const CLAIM_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

export const SAFE_POINTS = [
  "Portería",
  "Bienestar Universitario — Bloque A Piso 1",
  "Biblioteca — Bloque A Piso 2",
  "Dirección de Programa — Bloque A Piso 4",
] as const;

export type SafePointName = (typeof SAFE_POINTS)[number];

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ITEM_IMAGES = 3;
export const MAX_CLAIM_EVIDENCE_IMAGES = 1;
