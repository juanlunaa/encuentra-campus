import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimForm } from "@/components/ClaimForm";
import { ClaimList } from "@/components/ClaimList";
import { CommentSection } from "@/components/CommentSection";
import {
  CUSTODY_MODE_LABELS,
  ITEM_STATUS_LABELS,
  OTHER_CATEGORY,
  type ItemStatus,
} from "@/lib/catalogs";
import { NotFoundError } from "@/lib/errors";
import { authService } from "@/services/auth.service";
import { claimService } from "@/services/claim.service";
import { foundItemService } from "@/services/found-item.service";
import type { ClaimDTO } from "@/types/claim";
import type { FoundItemDetailDTO } from "@/types/found-item";
import { ItemOwnerActions } from "./ItemOwnerActions";

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_BADGE_CLASSES: Record<ItemStatus, string> = {
  disponible: "text-cobalt",
  en_custodia_campus: "text-brick",
  en_reclamo: "text-ochre",
  devuelto: "text-moss",
};

const fullDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return fullDateFormatter.format(date);
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  const user = await authService.getCurrentSessionUser();

  let item: FoundItemDetailDTO;
  try {
    item = await foundItemService.getDetail(id, user?.id ?? null);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const isPublisher = Boolean(user && user.id === item.publisherId);
  const supportsClaims = item.status !== "en_custodia_campus";

  let publisherClaims: ClaimDTO[] = [];
  let myClaims: ClaimDTO[] = [];

  if (supportsClaims && user) {
    if (isPublisher) {
      publisherClaims = await claimService.listForItem(item.id, user.id);
    } else {
      myClaims = await claimService.listMyClaimsForItem(item.id, user.id);
    }
  }

  const categoryLabel =
    item.category === OTHER_CATEGORY && item.customCategory
      ? `Otra: ${item.customCategory}`
      : item.category;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link
          href="/"
          className="font-mono text-xs tracking-[0.08em] text-cobalt uppercase hover:underline"
        >
          ← Volver a explorar
        </Link>
      </div>

      <article className="overflow-hidden rounded-md border border-rule bg-bone">
        {/* Encabezado */}
        <div className="border-b border-rule p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`stamp ${STATUS_BADGE_CLASSES[item.status]}`}
            >
              {ITEM_STATUS_LABELS[item.status]}
            </span>
            <span className="rounded-sm border border-rule bg-paper px-2 py-0.5 text-xs font-medium text-ink-soft">
              {categoryLabel}
            </span>
            <span className="ml-auto font-mono text-[11px] tracking-wide text-sepia">
              N.º {item.id}
            </span>
          </div>

          <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            {item.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-sepia">
            <span>
              Publicado por{" "}
              <strong className="font-medium text-ink">
                {item.publisherName}
              </strong>
            </span>
            <span>Hallazgo: {formatDate(item.foundAt)}</span>
            <span>Publicado: {formatDate(item.createdAt)}</span>
          </div>

          {isPublisher && (
            <div className="mt-4 border-t border-rule/70 pt-4">
              <ItemOwnerActions itemId={item.id} status={item.status} />
            </div>
          )}
        </div>

        {/* Galería de fotos */}
        {item.images.length > 0 && (
          <div className="border-b border-rule bg-paper p-5 sm:p-7">
            <div
              className={`grid gap-3 ${
                item.images.length === 1
                  ? "grid-cols-1"
                  : item.images.length === 2
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1 sm:grid-cols-3"
              }`}
            >
              {item.images.map((image, idx) => (
                <a
                  key={image.key}
                  href={image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group relative block overflow-hidden rounded-sm border border-rule bg-bone ${
                    item.images.length === 1
                      ? "aspect-[16/10] sm:h-[420px] sm:aspect-auto"
                      : "aspect-[4/3]"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={`${item.title} — fotografía ${idx + 1}`}
                    fill
                    priority={idx === 0}
                    sizes={
                      item.images.length === 1
                        ? "(max-width: 1024px) 100vw, 900px"
                        : item.images.length === 2
                          ? "(max-width: 640px) 100vw, 450px"
                          : "(max-width: 640px) 100vw, 300px"
                    }
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Cuerpo de detalle */}
        <div className="space-y-6 p-5 sm:p-7">
          <div>
            <h2 className="font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase">
              Descripción
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink sm:text-base">
              {item.description}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-rule bg-paper p-4">
              <h3 className="font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase">
                Ubicación del hallazgo
              </h3>
              <p className="mt-1.5 text-sm font-semibold text-ink">
                {item.zoneName}
              </p>
              <p className="mt-1 font-mono text-xs text-ink-soft">
                {item.location.floor} · {item.location.roomOrDetail}
              </p>
            </div>

            <div className="rounded-md border border-rule bg-paper p-4">
              <h3 className="font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase">
                Modalidad de custodia
              </h3>
              <p className="mt-1.5 text-sm font-semibold text-ink">
                {CUSTODY_MODE_LABELS[item.custody.mode]}
              </p>
              {item.custody.mode === "campus_safe_point" &&
                item.custody.safePointName && (
                  <p className="mt-1 text-sm text-brick-deep">
                    Punto seguro:{" "}
                    <strong>{item.custody.safePointName}</strong>
                  </p>
                )}
              {item.custody.mode === "personal" &&
                item.custody.verificationQuestion && (
                  <p className="mt-1 text-xs text-sepia">
                    <strong>Pregunta de verificación:</strong>{" "}
                    {item.custody.verificationQuestion}
                  </p>
                )}
            </div>
          </div>

          {item.custody.mode === "campus_safe_point" &&
            item.custody.safePointName && (
              <div className="rounded-sm border border-l-2 border-brick-line border-l-brick bg-brick-wash px-4 py-3 text-sm text-brick-deep">
                Este objeto fue entregado directamente en{" "}
                <strong>{item.custody.safePointName}</strong>. Si es tuyo,
                acércate a ese punto del campus para reclamarlo.
              </div>
            )}

          {item.publisherContactPhone && (
            <div className="rounded-sm border border-l-2 border-cobalt-line border-l-cobalt bg-cobalt-wash p-4 text-sm text-cobalt-deep">
              <p className="font-semibold">
                Tu reclamo fue aprobado — Contacto del publicante
              </p>
              <p className="mt-1">
                Comunícate con <strong>{item.publisherName}</strong> al teléfono
                o WhatsApp:{" "}
                <strong className="font-mono text-base text-cobalt">
                  {item.publisherContactPhone}
                </strong>
              </p>
            </div>
          )}

          {item.status === "devuelto" && item.delivery.returnedAt && (
            <div className="rounded-sm border border-l-2 border-moss-line border-l-moss bg-moss-wash px-4 py-3 text-sm text-moss">
              Objeto devuelto a su dueño el{" "}
              <strong className="font-mono">{formatDate(item.delivery.returnedAt)}</strong>.
            </div>
          )}

          {item.tags.length > 0 && (
            <div>
              <h3 className="font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase">
                Etiquetas
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/?tag=${encodeURIComponent(tag)}`}
                    className="rounded-sm border border-rule bg-paper px-2 py-0.5 font-mono text-xs text-ink-soft transition hover:border-cobalt hover:text-cobalt"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {supportsClaims && isPublisher && (
        <ClaimList
          itemId={item.id}
          initialStatus={item.status}
          initialClaims={publisherClaims}
        />
      )}

      {supportsClaims && !isPublisher && (
        <ClaimForm
          itemId={item.id}
          itemStatus={item.status}
          verificationQuestion={item.custody.verificationQuestion}
          currentUserId={user?.id ?? null}
          initialMyClaims={myClaims}
        />
      )}

      <CommentSection
        itemId={item.id}
        itemStatus={item.status}
        initialComments={item.comments}
        currentUserId={user?.id ?? null}
      />
    </main>
  );
}
