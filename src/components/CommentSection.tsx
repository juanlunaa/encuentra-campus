"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { ItemStatus } from "@/lib/catalogs";
import type { ItemCommentDTO } from "@/types/found-item";

interface CommentSectionProps {
  itemId: string;
  itemStatus: ItemStatus;
  initialComments: ItemCommentDTO[];
  currentUserId: string | null;
}

interface ApiErrorShape {
  error?: {
    message?: string;
  };
}

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

export function CommentSection({
  itemId,
  itemStatus,
  initialComments,
  currentUserId,
}: CommentSectionProps) {
  const [comments, setComments] = useState<ItemCommentDTO[]>(initialComments);
  const [body, setBody] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isClosedForComments = itemStatus === "devuelto";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmed = body.trim();
    if (!trimmed) {
      setErrorMessage("El comentario no puede estar vacío.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/items/${itemId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ body: trimmed }),
      });

      const data = (await response.json()) as {
        comment?: ItemCommentDTO;
      } & ApiErrorShape;

      if (!response.ok || !data.comment) {
        setErrorMessage(
          data.error?.message ?? "No se pudo publicar el comentario.",
        );
        return;
      }

      setComments((prev) => [...prev, data.comment!]);
      setBody("");
    } catch {
      setErrorMessage(
        "Error de conexión al publicar el comentario. Intenta nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    setErrorMessage(null);
    setDeletingId(commentId);

    try {
      const response = await fetch(
        `/api/items/${itemId}/comments/${commentId}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as ApiErrorShape;
        setErrorMessage(
          data.error?.message ?? "No se pudo eliminar el comentario.",
        );
        return;
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      setErrorMessage(
        "Error de conexión al eliminar el comentario. Intenta nuevamente.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section
      aria-label="Comentarios públicos"
      className="rounded-md border border-rule bg-bone p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">
          Comentarios públicos ({comments.length})
        </h2>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-alert-line bg-alert-wash px-4 py-2.5 text-sm text-alert"
        >
          {errorMessage}
        </div>
      )}

      {comments.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-rule bg-paper px-4 py-6 text-center text-sm text-sepia">
          Todavía no hay comentarios en esta publicación.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {comments.map((comment) => {
            const isAuthor = currentUserId === comment.authorId;
            return (
              <li
                key={comment.id}
                className="rounded-md border border-rule bg-paper p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-ink">
                      {comment.authorName}
                    </span>
                    <span className="text-rule-strong">·</span>
                    <time
                      dateTime={comment.createdAt}
                      className="font-mono text-[11px] text-sepia"
                    >
                      {formatDateTime(comment.createdAt)}
                    </time>
                  </div>

                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="cursor-pointer text-xs font-medium text-alert transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === comment.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  )}
                </div>

                <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">
                  {comment.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 border-t border-rule pt-5">
        {isClosedForComments ? (
          <p className="rounded-md bg-shade px-4 py-3 text-sm text-sepia">
            Esta publicación ya fue marcada como <strong>Devuelto</strong>, por
            lo que no admite nuevos comentarios.
          </p>
        ) : !currentUserId ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-paper px-4 py-3 text-sm text-sepia">
            <span>
              Inicia sesión para hacer preguntas generales o aportar contexto.
            </span>
            <Link
              href="/login"
              className="rounded-sm bg-cobalt px-3.5 py-1.5 text-xs font-semibold text-bone transition hover:bg-cobalt-deep"
            >
              Iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label
              htmlFor="new-comment-body"
              className="block text-sm font-medium text-ink-soft"
            >
              Agregar un comentario público
            </label>
            <textarea
              id="new-comment-body"
              rows={3}
              maxLength={1000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe una pregunta general o información útil (evita compartir datos personales sensibles aquí)..."
              className="w-full rounded-sm border border-rule-strong px-3.5 py-2 text-sm text-ink placeholder:text-faint focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-faint">
                {body.trim().length}/1000
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer rounded-sm bg-cobalt px-4 py-2 text-sm font-semibold text-bone transition hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Publicando..." : "Publicar comentario"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
