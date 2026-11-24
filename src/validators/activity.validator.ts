import { z } from "zod";
import { CLAIM_STATUSES, ITEM_STATUSES } from "@/lib/catalogs";

function emptyToUndefined(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return value;
}

function parseOptionalBoolean(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "") return undefined;
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return value;
}

const optionalQueryStringSchema = z.preprocess(
  emptyToUndefined,
  z
    .string({ error: "El texto de búsqueda debe ser una cadena válida." })
    .trim()
    .max(120, "El texto de búsqueda no puede superar los 120 caracteres.")
    .optional(),
);

const pageSchema = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "La página debe ser un número válido." })
    .int("La página debe ser un número entero.")
    .min(1, "La página debe ser mayor o igual a 1.")
    .default(1),
);

const limitSchema = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "El límite por página debe ser un número válido." })
    .int("El límite por página debe ser un número entero.")
    .min(1, "El límite mínimo por página es 1.")
    .max(50, "El límite máximo por página es 50.")
    .default(10),
);

export const activityItemsQuerySchema = z.object({
  query: optionalQueryStringSchema,
  status: z.preprocess(
    emptyToUndefined,
    z
      .enum(ITEM_STATUSES, {
        error: "El estado de publicación del filtro no es válido.",
      })
      .optional(),
  ),
  hasPendingClaims: z.preprocess(
    parseOptionalBoolean,
    z
      .boolean({
        error: "El filtro de reclamos pendientes debe ser verdadero o falso.",
      })
      .optional(),
  ),
  page: pageSchema,
  limit: limitSchema,
});

export const activityClaimsQuerySchema = z.object({
  query: optionalQueryStringSchema,
  status: z.preprocess(
    emptyToUndefined,
    z
      .enum(CLAIM_STATUSES, {
        error: "El estado de reclamo del filtro no es válido.",
      })
      .optional(),
  ),
  page: pageSchema,
  limit: limitSchema,
});

export type ActivityItemsQuery = z.infer<typeof activityItemsQuerySchema>;
export type ActivityClaimsQuery = z.infer<typeof activityClaimsQuerySchema>;
