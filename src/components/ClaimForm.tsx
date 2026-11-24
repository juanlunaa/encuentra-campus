"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  CLAIM_STATUS_LABELS,
  MAX_IMAGE_SIZE_BYTES,
  type ClaimStatus,
  type ItemStatus,
} from "@/lib/catalogs";
import type { ClaimDTO } from "@/types/claim";

interface ClaimFormProps {
  itemId: string;
  itemStatus: ItemStatus;
  verificationQuestion: string | null;
  currentUserId: string | null;
  initialMyClaims: ClaimDTO[];
}

interface ApiErrorShape {
  error?: {
    message?: string;
  };
}

const CLAIM_STATUS_BADGE_CLASSES: Record<ClaimStatus, string> = {
  pending: "text-ochre",
  approved: "text-cobalt",
  rejected: "text-alert",
  cancelled: "text-sepia",
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return dateTimeFormatter.format(date);
}

function isAllowedMime(type: string): boolean {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

export function ClaimForm({
  itemId,
  itemStatus,
  verificationQuestion,
  currentUserId,
  initialMyClaims,
}: ClaimFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [myClaims, setMyClaims] = useState<ClaimDTO[]>(initialMyClaims);
  const [verificationAnswer, setVerificationAnswer] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMyClaims(initialMyClaims);
  }, [initialMyClaims]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const hasPendingClaim = myClaims.some((claim) => claim.status === "pending");
  const hasApprovedClaim = myClaims.some(
    (claim) => claim.status === "approved",
  );
  const canSubmitClaim =
    Boolean(currentUserId) && itemStatus === "disponible" && !hasPendingClaim;

  function clearSelectedFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setEvidenceFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null);
    const file = event.target.files?.[0];
    if (!file) {
      clearSelectedFile();
      return;
    }

    if (!isAllowedMime(file.type)) {
      setErrorMessage(
        `El archivo "${file.name}" tiene un formato no permitido. Solo se aceptan imágenes JPG, PNG o WebP.`,
      );
      clearSelectedFile();
      return;
    }

    if (file.size <= 0) {
      setErrorMessage(`El archivo "${file.name}" está vacío.`);
      clearSelectedFile();
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage(
        `El archivo "${file.name}" supera el tamaño máximo permitido de 5 MB.`,
      );
      clearSelectedFile();
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setEvidenceFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = verificationAnswer.trim();
    if (trimmed.length < 3) {
      setErrorMessage(
        "La descripción de verificación debe tener al menos 3 caracteres.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("verificationAnswer", trimmed);
      if (evidenceFile) {
        formData.append("evidenceImage", evidenceFile);
      }

      const response = await fetch(`/api/items/${itemId}/claims`, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const data = (await response.json().catch(() => ({}))) as {
        claim?: ClaimDTO;
      } & ApiErrorShape;

      if (!response.ok || !data.claim) {
        setErrorMessage(
          data.error?.message ??
            "No se pudo enviar la solicitud de reclamo. Intenta nuevamente.",
        );
        return;
      }

      setMyClaims((prev) => [data.claim!, ...prev]);
      setVerificationAnswer("");
      clearSelectedFile();
      setSuccessMessage(
        "Tu solicitud de reclamo fue enviada correctamente. El publicante la revisará pronto.",
      );
      router.refresh();
    } catch {
      setErrorMessage(
        "Error de conexión al enviar la solicitud de reclamo. Intenta nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Solicitar reclamo de propiedad"
      className="rounded-md border border-rule bg-bone p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            ¿Este objeto es tuyo?
          </h2>
          <p className="mt-0.5 text-sm text-sepia">
            Envía una solicitud privada de reclamo para verificar tu propiedad
            con el publicante.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-alert-line bg-alert-wash px-4 py-3 text-sm text-alert"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-4 rounded-md border border-cobalt-line bg-cobalt-wash px-4 py-3 text-sm text-cobalt"
        >
          {successMessage}
        </div>
      )}

      {/* Historial de reclamos propios del solicitante */}
      {myClaims.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase">
            Tus solicitudes en esta publicación
          </h3>
          <ul className="space-y-3">
            {myClaims.map((claim) => (
              <li
                key={claim.id}
                className="rounded-md border border-rule bg-paper p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`stamp ${CLAIM_STATUS_BADGE_CLASSES[claim.status]}`}
                  >
                    {CLAIM_STATUS_LABELS[claim.status]}
                  </span>
                  <time
                    dateTime={claim.createdAt}
                    className="font-mono text-[11px] text-sepia"
                  >
                    Enviado el {formatDateTime(claim.createdAt)}
                  </time>
                </div>

                <p className="mt-2 whitespace-pre-line text-ink-soft">
                  {claim.verificationAnswer}
                </p>

                {claim.evidenceImage && (
                  <div className="mt-3">
                    <a
                      href={claim.evidenceImage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block overflow-hidden rounded-sm border border-rule bg-bone"
                    >
                      <Image
                        src={claim.evidenceImage.url}
                        alt="Evidencia adjunta en tu reclamo"
                        width={128}
                        height={96}
                        sizes="128px"
                        className="h-24 w-32 object-cover"
                      />
                    </a>
                  </div>
                )}

                {claim.resolutionReason && (
                  <p className="mt-2 rounded-sm bg-bone px-3 py-2 text-xs text-sepia ring-1 ring-rule">
                    <strong>Motivo:</strong> {claim.resolutionReason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        {!currentUserId ? (
          itemStatus === "disponible" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-paper px-4 py-3.5 text-sm text-ink-soft">
              <span>
                Inicia sesión con tu cuenta de estudiante para reclamar este
                objeto.
              </span>
              <Link
                href="/login"
                className="rounded-sm bg-cobalt px-4 py-2 text-xs font-semibold text-bone transition hover:bg-cobalt-deep"
              >
                Iniciar sesión
              </Link>
            </div>
          ) : (
            <p className="rounded-md bg-shade px-4 py-3 text-sm text-sepia">
              {itemStatus === "en_reclamo"
                ? "Esta publicación ya tiene un reclamo aprobado en curso y no acepta nuevas solicitudes."
                : "Esta publicación ya fue marcada como devuelta y no acepta nuevos reclamos."}
            </p>
          )
        ) : hasApprovedClaim ? (
          <p className="rounded-md border border-cobalt-line bg-cobalt-wash px-4 py-3 text-sm text-cobalt-deep">
            Tu solicitud fue aprobada. Usa el medio de contacto mostrado arriba
            para coordinar la entrega con el publicante.
          </p>
        ) : hasPendingClaim ? (
          <p className="rounded-md border border-ochre-line bg-ochre-wash px-4 py-3 text-sm text-ochre">
            Ya tienes una solicitud de reclamo <strong>pendiente</strong> para
            esta publicación. Espera a que el publicante la revise.
          </p>
        ) : itemStatus === "en_reclamo" ? (
          <p className="rounded-md bg-shade px-4 py-3 text-sm text-sepia">
            Esta publicación ya tiene un reclamo aprobado en curso y no acepta
            nuevas solicitudes en este momento.
          </p>
        ) : itemStatus === "devuelto" ? (
          <p className="rounded-md bg-shade px-4 py-3 text-sm text-sepia">
            Esta publicación ya fue marcada como <strong>Devuelto</strong> y no
            acepta nuevos reclamos.
          </p>
        ) : canSubmitClaim ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {verificationQuestion ? (
              <div className="rounded-md border border-cobalt-line bg-cobalt-wash/70 p-4 text-sm text-cobalt-deep">
                <p className="text-xs font-semibold tracking-wide text-cobalt uppercase">
                  Pregunta de verificación del publicante
                </p>
                <p className="mt-1 font-medium">{verificationQuestion}</p>
              </div>
            ) : (
              <div className="rounded-md border border-rule bg-paper p-4 text-xs text-sepia">
                Describe un detalle privado único del objeto (marca, serial,
                contenido interior, fondo de pantalla, rayones o stickers) que
                permita al publicante confirmar que eres el verdadero dueño.
              </div>
            )}

            <div>
              <label
                htmlFor="claim-verification-answer"
                className="block text-sm font-medium text-ink-soft"
              >
                {verificationQuestion
                  ? "Tu respuesta de verificación"
                  : "Descripción del detalle privado"}
                <span className="text-alert"> *</span>
              </label>
              <textarea
                id="claim-verification-answer"
                rows={4}
                maxLength={1500}
                required
                value={verificationAnswer}
                onChange={(e) => setVerificationAnswer(e.target.value)}
                placeholder="Escribe aquí los detalles que demuestran que el objeto te pertenece..."
                className="mt-1.5 w-full rounded-sm border border-rule-strong px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
              />
              <div className="mt-1 flex justify-between text-xs text-faint">
                <span>
                  Solo el publicante podrá leer esta respuesta.
                </span>
                <span>{verificationAnswer.trim().length}/1500</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="claim-evidence-image"
                className="block text-sm font-medium text-ink-soft"
              >
                Imagen de evidencia{" "}
                <span className="font-normal text-sepia">
                  (opcional, máximo 1 imagen JPG, PNG o WebP hasta 5 MB)
                </span>
              </label>
              <input
                ref={fileInputRef}
                id="claim-evidence-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="mt-1.5 block w-full text-sm text-sepia file:mr-3 file:cursor-pointer file:rounded-sm file:border-0 file:bg-shade file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-ink-soft hover:file:bg-rule"
              />

              {previewUrl && evidenceFile && (
                <div className="mt-3 flex items-center gap-3 rounded-md border border-rule bg-paper p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Vista previa de evidencia"
                    className="h-16 w-16 rounded-sm object-cover"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="truncate font-medium text-ink">
                      {evidenceFile.name}
                    </p>
                    <p className="text-sepia">
                      {(evidenceFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:bg-shade"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer rounded-sm bg-cobalt px-5 py-2.5 text-sm font-semibold text-bone transition hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Enviando reclamo..."
                  : "Enviar solicitud de reclamo"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
