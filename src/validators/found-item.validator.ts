import { z } from "zod";
import {
  CUSTODY_MODES,
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  OTHER_CATEGORY,
} from "@/lib/catalogs";

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const objectIdField = (message: string) =>
  z
    .string({ error: message })
    .trim()
    .regex(OBJECT_ID_REGEX, message);

function normalizeTagsList(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    const cleaned = raw.trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cleaned);
    }
  }

  return result;
}

const tagItemSchema = z
  .string({ error: "Cada etiqueta debe ser un texto válido." })
  .trim()
  .min(1, "Las etiquetas no pueden estar vacías.")
  .max(30, "Cada etiqueta puede tener máximo 30 caracteres.");

const tagsArraySchema = z
  .array(tagItemSchema)
  .max(15, "Puedes agregar máximo 15 etiquetas.")
  .transform(normalizeTagsList);

function parseDateInput(value: unknown, endOfDayIfDateOnly = false): unknown {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (endOfDayIfDateOnly && DATE_ONLY_REGEX.test(trimmed)) {
      return new Date(`${trimmed}T23:59:59.999Z`);
    }
    return new Date(trimmed);
  }
  return value;
}

const foundAtSchema = z.preprocess(
  (value) => parseDateInput(value, false),
  z
    .date({ error: "La fecha de hallazgo debe ser una fecha válida." })
    .refine((date) => !Number.isNaN(date.getTime()), {
      message: "La fecha de hallazgo no es válida.",
    })
    .refine((date) => date.getTime() <= Date.now() + 24 * 60 * 60 * 1000, {
      message: "La fecha de hallazgo no puede estar en el futuro.",
    }),
);

const optionalQueryDateSchema = (endOfDayIfDateOnly: boolean) =>
  z.preprocess(
    (value) => parseDateInput(value, endOfDayIfDateOnly),
    z
      .date({ error: "El filtro de fecha no tiene un formato válido." })
      .refine((date) => !Number.isNaN(date.getTime()), {
        message: "El filtro de fecha no es válido.",
      })
      .optional(),
  );

const locationSchema = z.object({
  floor: z
    .string({ error: "El piso es obligatorio." })
    .trim()
    .min(1, "Debes indicar el piso donde encontraste el objeto.")
    .max(50, "El piso no puede superar los 50 caracteres."),
  roomOrDetail: z
    .string({ error: "El detalle de ubicación es obligatorio." })
    .trim()
    .min(1, "Debes indicar el salón o referencia exacta.")
    .max(150, "El detalle de ubicación no puede superar los 150 caracteres."),
});

const custodySchema = z.object({
  mode: z.enum(CUSTODY_MODES, {
    error: "Debes seleccionar una modalidad de custodia válida.",
  }),
  verificationQuestion: z
    .string()
    .trim()
    .max(300, "La pregunta de verificación no puede superar los 300 caracteres.")
    .nullable()
    .optional(),
  safePointName: z
    .string()
    .trim()
    .max(150, "El nombre del punto seguro no puede superar los 150 caracteres.")
    .nullable()
    .optional(),
});

export const createFoundItemSchema = z
  .object({
    title: z
      .string({ error: "El título es obligatorio." })
      .trim()
      .min(3, "El título debe tener al menos 3 caracteres.")
      .max(120, "El título no puede superar los 120 caracteres."),
    description: z
      .string({ error: "La descripción es obligatoria." })
      .trim()
      .min(5, "La descripción debe tener al menos 5 caracteres.")
      .max(2000, "La descripción no puede superar los 2000 caracteres."),
    category: z.enum(ITEM_CATEGORIES, {
      error: "Debes seleccionar una categoría válida.",
    }),
    customCategory: z
      .string()
      .trim()
      .max(60, "La categoría personalizada no puede superar los 60 caracteres.")
      .nullable()
      .optional(),
    zoneId: objectIdField("Debes seleccionar una zona válida del campus."),
    location: locationSchema,
    custody: custodySchema,
    tags: tagsArraySchema.optional().default([]),
    foundAt: foundAtSchema,
  })
  .superRefine((data, ctx) => {
    if (data.category === OTHER_CATEGORY) {
      const custom = data.customCategory?.trim() ?? "";
      if (custom.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["customCategory"],
          message:
            'Debes especificar la categoría cuando seleccionas la opción "Otra".',
        });
      }
    }

    if (data.custody.mode === "campus_safe_point") {
      const safePoint = data.custody.safePointName?.trim() ?? "";
      if (safePoint.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["custody", "safePointName"],
          message:
            "Debes indicar el punto seguro del campus donde entregaste el objeto.",
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    customCategory:
      data.category === OTHER_CATEGORY
        ? (data.customCategory?.trim() ?? null)
        : null,
    custody:
      data.custody.mode === "campus_safe_point"
        ? {
            mode: data.custody.mode,
            verificationQuestion: null,
            safePointName: data.custody.safePointName?.trim() ?? null,
          }
        : {
            mode: data.custody.mode,
            verificationQuestion:
              data.custody.verificationQuestion?.trim() || null,
            safePointName: null,
          },
  }));

export const updateFoundItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres.")
    .max(120, "El título no puede superar los 120 caracteres.")
    .optional(),
  description: z
    .string()
    .trim()
    .min(5, "La descripción debe tener al menos 5 caracteres.")
    .max(2000, "La descripción no puede superar los 2000 caracteres.")
    .optional(),
  category: z
    .enum(ITEM_CATEGORIES, {
      error: "Debes seleccionar una categoría válida.",
    })
    .optional(),
  customCategory: z
    .string()
    .trim()
    .max(60, "La categoría personalizada no puede superar los 60 caracteres.")
    .nullable()
    .optional(),
  zoneId: objectIdField("Debes seleccionar una zona válida del campus.").optional(),
  location: locationSchema.optional(),
  custody: custodySchema.optional(),
  tags: tagsArraySchema.optional(),
  addTags: tagsArraySchema.optional(),
  removeTags: z
    .array(z.string().trim().min(1))
    .max(15)
    .optional(),
  removeImageKeys: z
    .array(z.string().trim().min(1))
    .max(3)
    .optional(),
  foundAt: foundAtSchema.optional(),
});

export const listFoundItemsQuerySchema = z
  .object({
    query: z
      .string()
      .trim()
      .max(120, "El texto de búsqueda es demasiado largo.")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    category: z
      .enum(ITEM_CATEGORIES, {
        error: "La categoría del filtro no es válida.",
      })
      .optional(),
    zoneId: objectIdField("La zona del filtro no es válida.").optional(),
    status: z
      .enum(ITEM_STATUSES, {
        error: "El estado del filtro no es válido.",
      })
      .optional(),
    tag: z
      .string()
      .trim()
      .max(30)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    from: optionalQueryDateSchema(false),
    to: optionalQueryDateSchema(true),
    page: z.coerce
      .number({ error: "La página debe ser un número." })
      .int()
      .min(1, "La página debe ser mayor o igual a 1.")
      .default(1),
    limit: z.coerce
      .number({ error: "El límite debe ser un número." })
      .int()
      .min(1, "El límite mínimo es 1.")
      .max(50, "El límite máximo por página es 50.")
      .default(12),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && data.from > data.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "La fecha final no puede ser anterior a la fecha inicial.",
      });
    }
  });

export const createCommentSchema = z.object({
  body: z
    .string({ error: "El comentario es obligatorio." })
    .trim()
    .min(1, "El comentario no puede estar vacío.")
    .max(1000, "El comentario no puede superar los 1000 caracteres."),
});

export type CreateFoundItemInput = z.infer<typeof createFoundItemSchema>;
export type UpdateFoundItemInput = z.infer<typeof updateFoundItemSchema>;
export type ListFoundItemsQuery = z.infer<typeof listFoundItemsQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

function parseStringArrayField(formData: FormData, key: string): string[] | undefined {
  const entries = formData.getAll(key);
  if (entries.length === 0) return undefined;

  const result: string[] = [];
  for (const entry of entries) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === "string" && item.trim()) {
              result.push(item.trim());
            }
          }
          continue;
        }
      } catch {
        // Si no es JSON válido, se procesa como texto separado por comas.
      }
    }

    for (const part of trimmed.split(",")) {
      const cleaned = part.trim();
      if (cleaned) result.push(cleaned);
    }
  }

  return result;
}

function getOptionalString(formData: FormData, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const val = formData.get(key);
    if (typeof val === "string") {
      return val;
    }
  }
  return undefined;
}

export function extractItemMultipartPayload(formData: FormData): {
  payload: Record<string, unknown>;
  files: File[];
} {
  const files: File[] = [];
  for (const key of ["images", "image"]) {
    for (const entry of formData.getAll(key)) {
      if (entry instanceof File && (entry.size > 0 || entry.name.length > 0)) {
        files.push(entry);
      }
    }
  }

  const rawJsonPayload = formData.get("payload");
  if (typeof rawJsonPayload === "string" && rawJsonPayload.trim().length > 0) {
    const parsed = JSON.parse(rawJsonPayload) as Record<string, unknown>;
    return { payload: parsed, files };
  }

  const payload: Record<string, unknown> = {};

  const title = getOptionalString(formData, "title");
  if (title !== undefined) payload.title = title;

  const description = getOptionalString(formData, "description");
  if (description !== undefined) payload.description = description;

  const category = getOptionalString(formData, "category");
  if (category !== undefined) payload.category = category;

  const customCategory = getOptionalString(formData, "customCategory");
  if (customCategory !== undefined) {
    payload.customCategory = customCategory.trim() || null;
  }

  const zoneId = getOptionalString(formData, "zoneId");
  if (zoneId !== undefined) payload.zoneId = zoneId;

  const foundAt = getOptionalString(formData, "foundAt");
  if (foundAt !== undefined) payload.foundAt = foundAt;

  const floor = getOptionalString(formData, "location.floor", "floor");
  const roomOrDetail = getOptionalString(
    formData,
    "location.roomOrDetail",
    "roomOrDetail",
  );
  if (floor !== undefined || roomOrDetail !== undefined) {
    payload.location = {
      floor: floor ?? "",
      roomOrDetail: roomOrDetail ?? "",
    };
  }

  const custodyMode = getOptionalString(
    formData,
    "custody.mode",
    "custodyMode",
  );
  const verificationQuestion = getOptionalString(
    formData,
    "custody.verificationQuestion",
    "verificationQuestion",
  );
  const safePointName = getOptionalString(
    formData,
    "custody.safePointName",
    "safePointName",
  );
  if (
    custodyMode !== undefined ||
    verificationQuestion !== undefined ||
    safePointName !== undefined
  ) {
    payload.custody = {
      mode: custodyMode ?? "personal",
      verificationQuestion: verificationQuestion?.trim() || null,
      safePointName: safePointName?.trim() || null,
    };
  }

  const tags = parseStringArrayField(formData, "tags");
  if (tags !== undefined) payload.tags = tags;

  const addTags = parseStringArrayField(formData, "addTags");
  if (addTags !== undefined) payload.addTags = addTags;

  const removeTags = parseStringArrayField(formData, "removeTags");
  if (removeTags !== undefined) payload.removeTags = removeTags;

  const removeImageKeys = parseStringArrayField(formData, "removeImageKeys");
  if (removeImageKeys !== undefined) payload.removeImageKeys = removeImageKeys;

  return { payload, files };
}
