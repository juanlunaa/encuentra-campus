"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string[]>;
  };
}

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [program, setProgram] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          fullName,
          email,
          program,
          contactPhone,
          password,
        }),
      });

      const data = (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        setGeneralError(
          data.error?.message ??
            "No se pudo completar el registro. Revisa los datos e intenta nuevamente.",
        );
        if (data.error?.details) {
          setFieldErrors(data.error.details);
        }
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setGeneralError(
        "No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-md border border-rule bg-bone p-6 sm:p-8">
        <div className="mb-6 flex justify-center border-b border-rule pb-5">
          <Image
            src="/imagotipo.png"
            alt="Encuentra Campus — Encuentra. Verifica. Recupera."
            width={1266}
            height={551}
            priority
            className="h-14 w-auto sm:h-16"
          />
        </div>

        <div className="mb-6">
          <h1 className="font-serif text-2xl font-medium tracking-tight text-ink">
            Crear cuenta de estudiante
          </h1>
          <p className="mt-1.5 text-sm text-sepia">
            Regístrate para publicar objetos encontrados, dejar comentarios y
            gestionar reclamos de propiedad en el campus.
          </p>
        </div>

        {generalError && (
          <div
            role="alert"
            className="mb-5 rounded-md border border-alert-line bg-alert-wash px-4 py-3 text-sm text-alert"
          >
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
            >
              Nombre completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. María Fernanda Gómez"
              className="mt-1.5 block w-full rounded-sm border border-rule-strong bg-bone px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            />
            {fieldErrors.fullName?.[0] && (
              <p className="mt-1 text-xs text-alert">
                {fieldErrors.fullName[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.correo@ejemplo.com"
              className="mt-1.5 block w-full rounded-sm border border-rule-strong bg-bone px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            />
            <p className="mt-1 text-xs text-sepia">
              Puedes usar cualquier correo electrónico válido.
            </p>
            {fieldErrors.email?.[0] && (
              <p className="mt-1 text-xs text-alert">
                {fieldErrors.email[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="program"
              className="block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
            >
              Programa académico o facultad
            </label>
            <input
              id="program"
              name="program"
              type="text"
              required
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="Ej. Tecnología en Desarrollo de Software"
              className="mt-1.5 block w-full rounded-sm border border-rule-strong bg-bone px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            />
            {fieldErrors.program?.[0] && (
              <p className="mt-1 text-xs text-alert">
                {fieldErrors.program[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="contactPhone"
              className="block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
            >
              Teléfono o WhatsApp de contacto
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              required
              autoComplete="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Ej. 3001234567"
              className="mt-1.5 block w-full rounded-sm border border-rule-strong bg-bone px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            />
            <p className="mt-1 text-xs text-sepia">
              Tu número permanece oculto; solo se muestra al solicitante cuyo
              reclamo apruebes.
            </p>
            {fieldErrors.contactPhone?.[0] && (
              <p className="mt-1 text-xs text-alert">
                {fieldErrors.contactPhone[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block font-mono text-[11px] font-medium tracking-[0.08em] text-sepia uppercase"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="mt-1.5 block w-full rounded-sm border border-rule-strong bg-bone px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            />
            {fieldErrors.password?.[0] && (
              <p className="mt-1 text-xs text-alert">
                {fieldErrors.password[0]}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full cursor-pointer rounded-sm bg-cobalt px-4 py-2.5 text-sm font-semibold text-bone transition hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-sepia">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-cobalt hover:text-cobalt hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
