"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ItemStatus } from "@/lib/catalogs";

interface ItemOwnerActionsProps {
  itemId: string;
  status: ItemStatus;
}

interface ApiErrorShape {
  error?: {
    message?: string;
  };
}

export function ItemOwnerActions({ itemId, status }: ItemOwnerActionsProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canEdit = status === "disponible" || status === "en_custodia_campus";

  async function handleConfirmDelete() {
    setErrorMessage(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as ApiErrorShape;
        setErrorMessage(
          data.error?.message ?? "No se pudo eliminar la publicación.",
        );
        setConfirmOpen(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage(
        "Error de conexión al eliminar la publicación. Intenta nuevamente.",
      );
      setConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? (
          <Link
            href={`/items/${itemId}/edit`}
            className="rounded-sm border border-rule-strong bg-bone px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:bg-shade"
          >
            Editar publicación
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="No se puede editar mientras está en reclamo o devuelto."
            className="cursor-not-allowed rounded-sm border border-rule bg-shade px-3.5 py-2 text-sm font-medium text-faint"
          >
            Edición bloqueada
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setErrorMessage(null);
            setConfirmOpen((prev) => !prev);
          }}
          disabled={isDeleting}
          className="cursor-pointer rounded-sm border border-alert-line bg-alert-wash px-3.5 py-2 text-sm font-medium text-alert transition hover:bg-alert-wash disabled:cursor-not-allowed disabled:opacity-60"
        >
          Eliminar publicación
        </button>
      </div>

      {confirmOpen && (
        <div
          role="dialog"
          aria-label="Confirmar eliminación"
          className="rounded-md border border-alert-line bg-alert-wash/90 p-4 text-sm"
        >
          <p className="font-semibold text-alert-deep">
            ¿Confirmas que deseas eliminar esta publicación?
          </p>
          <p className="mt-1 text-xs text-alert">
            Se eliminarán permanentemente la publicación, sus comentarios, los
            reclamos rechazados y las imágenes asociadas. Si existen reclamos
            pendientes o aprobados, la eliminación será bloqueada.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="cursor-pointer rounded-sm bg-alert px-3.5 py-1.5 text-xs font-semibold text-bone transition hover:bg-alert-deep disabled:opacity-60"
            >
              {isDeleting ? "Eliminando..." : "Sí, eliminar definitivamente"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
              className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-3.5 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-shade"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-alert-line bg-alert-wash px-4 py-2.5 text-sm text-alert"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
