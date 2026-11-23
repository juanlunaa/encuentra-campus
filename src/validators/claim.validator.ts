import { z } from "zod";

export const createClaimSchema = z.object({
  verificationAnswer: z
    .string({ error: "Debes describir el detalle privado o responder la pregunta de verificación." })
    .trim()
    .min(
      3,
      "La descripción de verificación debe tener al menos 3 caracteres.",
    )
    .max(
      1500,
      "La descripción de verificación no puede superar los 1500 caracteres.",
    ),
});

export const evaluateClaimSchema = z.object({
  action: z.enum(["approve", "reject"], {
    error: 'La acción debe ser "approve" (aprobar) o "reject" (rechazar).',
  }),
  resolutionReason: z
    .string({ error: "El motivo debe ser un texto válido." })
    .trim()
    .max(500, "El motivo no puede superar los 500 caracteres.")
    .nullable()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export const updateItemStatusSchema = z.object({
  status: z.enum(["devuelto", "disponible"], {
    error: 'El nuevo estado debe ser "devuelto" o "disponible".',
  }),
  reason: z
    .string({ error: "El motivo debe ser un texto válido." })
    .trim()
    .max(500, "El motivo no puede superar los 500 caracteres.")
    .nullable()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
export type EvaluateClaimInput = z.infer<typeof evaluateClaimSchema>;
export type UpdateItemStatusInput = z.infer<typeof updateItemStatusSchema>;

export function extractClaimMultipartPayload(formData: FormData): {
  payload: Record<string, unknown>;
  files: File[];
} {
  const files: File[] = [];
  for (const key of ["evidenceImage", "image", "evidence"]) {
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
  const verificationAnswer = formData.get("verificationAnswer");
  if (typeof verificationAnswer === "string") {
    payload.verificationAnswer = verificationAnswer;
  }

  return { payload, files };
}
