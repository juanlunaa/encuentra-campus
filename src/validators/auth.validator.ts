import { z } from "zod";

const emailField = z
  .string({ error: "El correo electrónico es obligatorio." })
  .trim()
  .toLowerCase()
  .min(5, "Ingresa un correo electrónico válido.")
  .max(254, "El correo electrónico es demasiado largo.")
  .pipe(z.email({ error: "Ingresa un correo electrónico con formato válido." }));

export const registerSchema = z.object({
  fullName: z
    .string({ error: "El nombre completo es obligatorio." })
    .trim()
    .min(2, "El nombre completo debe tener al menos 2 caracteres.")
    .max(120, "El nombre completo no puede superar los 120 caracteres."),
  email: emailField,
  password: z
    .string({ error: "La contraseña es obligatoria." })
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .max(128, "La contraseña no puede superar los 128 caracteres."),
  program: z
    .string({ error: "El programa académico o facultad es obligatorio." })
    .trim()
    .min(2, "El programa académico o facultad debe tener al menos 2 caracteres.")
    .max(150, "El programa académico o facultad no puede superar los 150 caracteres."),
  contactPhone: z
    .string({ error: "El medio de contacto (teléfono o WhatsApp) es obligatorio." })
    .trim()
    .min(5, "El teléfono o WhatsApp debe tener al menos 5 caracteres.")
    .max(30, "El teléfono o WhatsApp no puede superar los 30 caracteres."),
});

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: "La contraseña es obligatoria." })
    .min(1, "La contraseña es obligatoria.")
    .max(128, "La contraseña no puede superar los 128 caracteres."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
