"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string[]>;
  };
}

function getSafeRedirect(nextParam: string | null): string {
  if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return "/";
  }
  return nextParam;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        setGeneralError(
          data.error?.message ??
            "No se pudo iniciar sesión. Verifica tus credenciales.",
        );
        if (data.error?.details) {
          setFieldErrors(data.error.details);
        }
        return;
      }

      const redirectTo = getSafeRedirect(searchParams.get("next"));
      router.push(redirectTo);
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
          Iniciar sesión
        </h1>
        <p className="mt-1.5 text-sm text-sepia">
          Ingresa con tu cuenta para publicar objetos encontrados, comentar o
          enviar solicitudes de reclamo.
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
          {fieldErrors.email?.[0] && (
            <p className="mt-1 text-xs text-alert">{fieldErrors.email[0]}</p>
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña"
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
          {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-sepia">
        ¿Aún no tienes cuenta?{" "}
        <Link
          href="/register"
          className="font-semibold text-cobalt hover:text-cobalt hover:underline"
        >
          Regístrate aquí
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6 sm:py-16">
      <Suspense
        fallback={
          <div className="rounded-md border border-rule bg-bone p-8 text-center text-sm text-sepia">
            Cargando formulario...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
