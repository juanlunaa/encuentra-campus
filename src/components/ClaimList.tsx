"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CLAIM_STATUS_LABELS,
  type ClaimStatus,
  type ItemStatus,
} from "@/lib/catalogs";
import type { ClaimDTO } from "@/types/claim";
import type { FoundItemDetailDTO } from "@/types/found-item";

interface ClaimListProps {
  itemId: string;
  initialStatus: ItemStatus;
  initialClaims: ClaimDTO[];
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

export function ClaimList({
  itemId,
  initialStatus,
  initialClaims,
}: ClaimListProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ItemStatus>(initialStatus);
  const [claims, setClaims] = useState<ClaimDTO[]>(initialClaims);

  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
  const [rejectFormId, setRejectFormId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [revertOpen, setRevertOpen] = useState(false);
  const [revertReason, setRevertReason] = useState("");
  const [confirmReturnOpen, setConfirmReturnOpen] = useState(false);

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setClaims(initialClaims);
  }, [initialClaims]);

  const approvedClaim = claims.find((c) => c.status === "approved") ?? null;
  const pendingCount = claims.filter((c) => c.status === "pending").length;

  async function reloadClaims() {
    const res = await fetch(`/api/items/${itemId}/claims`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { claims?: ClaimDTO[] };
      if (Array.isArray(data.claims)) {
        setClaims(data.claims);
      }
    }
  }

  async function handleApprove(claimId: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setBusyKey(`approve:${claimId}`);

    try {
      const response = await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "approve" }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        claim?: ClaimDTO;
        item?: FoundItemDetailDTO;
        autoRejectedCount?: number;
      } & ApiErrorShape;

      if (!response.ok || !data.item) {
        setErrorMessage(
          data.error?.message ?? "No se pudo aprobar el reclamo.",
        );
        return;
      }

      setStatus(data.item.status);
      setApproveConfirmId(null);
      setRejectFormId(null);
      await reloadClaims();

      const autoRejected = data.autoRejectedCount ?? 0;
      setSuccessMessage(
        autoRejected > 0
          ? `Reclamo aprobado. Tu medio de contacto se compartió únicamente con el solicitante aprobado y ${autoRejected} ${autoRejected === 1 ? "solicitud pendiente fue rechazada" : "solicitudes pendientes fueron rechazadas"} automáticamente.`
          : "Reclamo aprobado. Tu medio de contacto se compartió únicamente con el solicitante aprobado.",
      );
      router.refresh();
    } catch {
      setErrorMessage(
        "Error de conexión al aprobar el reclamo. Intenta nuevamente.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleReject(claimId: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setBusyKey(`reject:${claimId}`);

    try {
      const response = await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "reject",
          resolutionReason: rejectReason.trim() || null,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        claim?: ClaimDTO;
      } & ApiErrorShape;

      if (!response.ok || !data.claim) {
        setErrorMessage(
          data.error?.message ?? "No se pudo rechazar el reclamo.",
        );
        return;
      }

      setRejectFormId(null);
      setRejectReason("");
      await reloadClaims();
      setSuccessMessage(
        "Reclamo rechazado. La publicación continúa disponible para otros solicitantes.",
      );
      router.refresh();
    } catch {
      setErrorMessage(
        "Error de conexión al rechazar el reclamo. Intenta nuevamente.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleStatusChange(
    nextStatus: "devuelto" | "disponible",
    reason?: string,
  ) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setBusyKey(`status:${nextStatus}`);

    try {
      const response = await fetch(`/api/items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          status: nextStatus,
          ...(reason?.trim() ? { reason: reason.trim() } : {}),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        item?: FoundItemDetailDTO;
      } & ApiErrorShape;

      if (!response.ok || !data.item) {
        setErrorMessage(
          data.error?.message ??
            "No se pudo actualizar el estado de la publicación.",
        );
        return;
      }

      setStatus(data.item.status);
      setConfirmReturnOpen(false);
      setRevertOpen(false);
      setRevertReason("");
      await reloadClaims();

      if (nextStatus === "devuelto") {
        setSuccessMessage(
          "¡Entrega confirmada! La publicación quedó marcada como Devuelto.",
        );
      } else {
        setSuccessMessage(
          "La publicación volvió a estado Disponible, el reclamo anterior fue cancelado y tu medio de contacto se ocultó nuevamente.",
        );
      }
      router.refresh();
    } catch {
      setErrorMessage(
        "Error de conexión al actualizar el estado de la publicación. Intenta nuevamente.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section
      aria-label="Panel privado de reclamos"
      className="rounded-md border border-rule bg-bone p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">
              Reclamos recibidos ({claims.length})
            </h2>
            <span className="rounded-sm border border-rule px-2 py-0.5 font-mono text-[10px] tracking-wider text-sepia uppercase">
              Privado · Solo visible para ti
            </span>
          </div>
          <p className="mt-0.5 text-sm text-sepia">
            Revisa las pruebas de propiedad y aprueba únicamente la del
            verdadero dueño.
          </p>
        </div>

        {pendingCount > 0 && (
          <span className="stamp bg-ochre-wash text-ochre">
            {pendingCount} {pendingCount === 1 ? "pendiente" : "pendientes"}
          </span>
        )}
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

      {/* Controles de cierre de entrega cuando está en_reclamo */}
      {status === "en_reclamo" && (
        <div className="mt-5 rounded-md border border-ochre-line bg-ochre-wash/70 p-4">
          <p className="text-sm font-semibold text-ochre">
            Entrega en coordinación
          </p>
          <p className="mt-1 text-xs text-ochre">
            Tu medio de contacto fue compartido únicamente con{" "}
            <strong>{approvedClaim?.claimantName ?? "el solicitante aprobado"}</strong>.
            Cuando entregues el objeto físicamente, confírmalo aquí; si la
            entrega no se concreta, puedes revertir la publicación a disponible.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setRevertOpen(false);
                setConfirmReturnOpen((prev) => !prev);
              }}
              disabled={busyKey !== null}
              className="cursor-pointer rounded-sm bg-cobalt px-3.5 py-2 text-xs font-semibold text-bone transition hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              Confirmar entrega (Marcar como devuelto)
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirmReturnOpen(false);
                setRevertOpen((prev) => !prev);
              }}
              disabled={busyKey !== null}
              className="cursor-pointer rounded-sm border border-ochre-line bg-bone px-3.5 py-2 text-xs font-semibold text-ochre transition hover:bg-ochre-wash disabled:cursor-not-allowed disabled:opacity-60"
            >
              Entrega no concretada (Revertir a disponible)
            </button>
          </div>

          {confirmReturnOpen && (
            <div className="mt-3 rounded-sm border border-cobalt-line bg-bone p-3 text-xs">
              <p className="font-semibold text-ink">
                ¿Confirmas que ya entregaste el objeto a su dueño?
              </p>
              <p className="mt-1 text-sepia">
                La publicación pasará a estado <strong>Devuelto</strong>, se
                registrará la fecha de devolución y se cerrarán nuevos
                comentarios y reclamos.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange("devuelto")}
                  disabled={busyKey !== null}
                  className="cursor-pointer rounded-sm bg-cobalt px-3 py-1.5 font-semibold text-bone transition hover:bg-cobalt-deep disabled:opacity-60"
                >
                  {busyKey === "status:devuelto"
                    ? "Guardando..."
                    : "Sí, confirmar devolución"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReturnOpen(false)}
                  disabled={busyKey !== null}
                  className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-3 py-1.5 font-medium text-ink-soft hover:bg-shade"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {revertOpen && (
            <div className="mt-3 space-y-2.5 rounded-sm border border-ochre-line bg-bone p-3 text-xs">
              <p className="font-semibold text-ink">
                Revertir publicación a Disponible
              </p>
              <p className="text-sepia">
                El reclamo aprobado se marcará como cancelado, tu contacto se
                ocultará nuevamente y podrás recibir nuevas solicitudes.
              </p>
              <div>
                <label
                  htmlFor="revert-reason"
                  className="block font-medium text-ink-soft"
                >
                  Motivo (opcional)
                </label>
                <input
                  id="revert-reason"
                  type="text"
                  maxLength={500}
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  placeholder="Ej.: El solicitante no asistió al encuentro o no era el objeto."
                  className="mt-1 w-full rounded-sm border border-rule-strong px-3 py-1.5 text-xs text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange("disponible", revertReason)}
                  disabled={busyKey !== null}
                  className="cursor-pointer rounded-sm bg-ochre-strong px-3 py-1.5 font-semibold text-bone transition hover:bg-ochre disabled:opacity-60"
                >
                  {busyKey === "status:disponible"
                    ? "Revirtiendo..."
                    : "Sí, revertir a disponible"}
                </button>
                <button
                  type="button"
                  onClick={() => setRevertOpen(false)}
                  disabled={busyKey !== null}
                  className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-3 py-1.5 font-medium text-ink-soft hover:bg-shade"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista de reclamos */}
      {claims.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-rule bg-paper px-4 py-6 text-center text-sm text-sepia">
          Aún no has recibido solicitudes de reclamo para esta publicación.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {claims.map((claim) => {
            const canEvaluate =
              claim.status === "pending" && status === "disponible";

            return (
              <li
                key={claim.id}
                className="rounded-md border border-rule bg-paper p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">
                        {claim.claimantName ?? "Estudiante"}
                      </span>
                      <span
                        className={`stamp ${CLAIM_STATUS_BADGE_CLASSES[claim.status]}`}
                      >
                        {CLAIM_STATUS_LABELS[claim.status]}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-sepia">
                      {claim.claimantProgram && (
                        <span>{claim.claimantProgram}</span>
                      )}
                      {claim.claimantProgram && <span>·</span>}
                      <time dateTime={claim.createdAt} className="font-mono text-[11px]">
                        {formatDateTime(claim.createdAt)}
                      </time>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-sm bg-bone p-3 text-sm text-ink ring-1 ring-rule">
                  <p className="text-xs font-semibold tracking-wide text-faint uppercase">
                    Respuesta / prueba de propiedad
                  </p>
                  <p className="mt-1 whitespace-pre-line">
                    {claim.verificationAnswer}
                  </p>
                </div>

                {claim.evidenceImage && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-medium text-sepia">
                      Evidencia adjunta (clic para ampliar):
                    </p>
                    <a
                      href={claim.evidenceImage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block overflow-hidden rounded-md border border-rule bg-bone transition hover:opacity-90"
                    >
                      <Image
                        src={claim.evidenceImage.url}
                        alt={`Evidencia enviada por ${claim.claimantName ?? "solicitante"}`}
                        width={176}
                        height={128}
                        sizes="176px"
                        className="h-32 w-44 object-cover"
                      />
                    </a>
                  </div>
                )}

                {claim.resolutionReason && (
                  <p className="mt-3 rounded-sm bg-bone px-3 py-2 text-xs text-sepia ring-1 ring-rule">
                    <strong>Motivo de resolución:</strong>{" "}
                    {claim.resolutionReason}
                    {claim.resolvedAt && (
                      <span className="ml-2 text-faint">
                        ({formatDateTime(claim.resolvedAt)})
                      </span>
                    )}
                  </p>
                )}

                {canEvaluate && (
                  <div className="mt-4 space-y-3 border-t border-rule pt-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectFormId(null);
                          setApproveConfirmId((prev) =>
                            prev === claim.id ? null : claim.id,
                          );
                        }}
                        disabled={busyKey !== null}
                        className="cursor-pointer rounded-sm bg-cobalt px-3.5 py-1.5 text-xs font-semibold text-bone transition hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Aprobar reclamo
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setApproveConfirmId(null);
                          setRejectReason("");
                          setRejectFormId((prev) =>
                            prev === claim.id ? null : claim.id,
                          );
                        }}
                        disabled={busyKey !== null}
                        className="cursor-pointer rounded-sm border border-alert-line bg-alert-wash px-3.5 py-1.5 text-xs font-semibold text-alert transition hover:bg-alert-wash disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Rechazar
                      </button>
                    </div>

                    {approveConfirmId === claim.id && (
                      <div className="rounded-sm border border-cobalt-line bg-cobalt-wash/70 p-3 text-xs text-cobalt-deep">
                        <p className="font-semibold">
                          ¿Confirmas aprobar el reclamo de{" "}
                          {claim.claimantName ?? "este estudiante"}?
                        </p>
                        <p className="mt-1 text-cobalt-deep">
                          Tu medio de contacto se revelará únicamente a este
                          solicitante, la publicación pasará a estado{" "}
                          <strong>En reclamo</strong> y cualquier otro reclamo
                          pendiente será rechazado automáticamente.
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(claim.id)}
                            disabled={busyKey !== null}
                            className="cursor-pointer rounded-sm bg-cobalt px-3 py-1.5 font-semibold text-bone hover:bg-cobalt-deep disabled:opacity-60"
                          >
                            {busyKey === `approve:${claim.id}`
                              ? "Aprobando..."
                              : "Sí, aprobar y compartir contacto"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setApproveConfirmId(null)}
                            disabled={busyKey !== null}
                            className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-3 py-1.5 font-medium text-ink-soft hover:bg-shade"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {rejectFormId === claim.id && (
                      <div className="space-y-2 rounded-sm border border-alert-line bg-bone p-3 text-xs">
                        <label
                          htmlFor={`reject-reason-${claim.id}`}
                          className="block font-semibold text-ink"
                        >
                          Motivo del rechazo (opcional)
                        </label>
                        <input
                          id={`reject-reason-${claim.id}`}
                          type="text"
                          maxLength={500}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Ej.: Los detalles no coinciden con el objeto encontrado."
                          className="w-full rounded-sm border border-rule-strong px-3 py-1.5 text-xs text-ink focus:border-alert focus:ring-2 focus:ring-alert/15 focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleReject(claim.id)}
                            disabled={busyKey !== null}
                            className="cursor-pointer rounded-sm bg-alert px-3 py-1.5 font-semibold text-bone hover:bg-alert-deep disabled:opacity-60"
                          >
                            {busyKey === `reject:${claim.id}`
                              ? "Rechazando..."
                              : "Confirmar rechazo"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectFormId(null)}
                            disabled={busyKey !== null}
                            className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-3 py-1.5 font-medium text-ink-soft hover:bg-shade"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
