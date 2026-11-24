import Image from "next/image";
import Link from "next/link";
import {
  ITEM_STATUS_LABELS,
  OTHER_CATEGORY,
  type ItemStatus,
} from "@/lib/catalogs";
import type { FoundItemSummaryDTO } from "@/types/found-item";

interface ItemCardProps {
  item: FoundItemSummaryDTO;
}

const STATUS_BADGE_CLASSES: Record<ItemStatus, string> = {
  disponible: "text-cobalt",
  en_custodia_campus: "text-brick",
  en_reclamo: "text-ochre",
  devuelto: "text-moss",
};

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormatter.format(date);
}

export function ItemCard({ item }: ItemCardProps) {
  const coverImage = item.images[0] ?? null;
  const categoryLabel =
    item.category === OTHER_CATEGORY && item.customCategory
      ? `Otra: ${item.customCategory}`
      : item.category;

  const visibleTags = item.tags.slice(0, 3);
  const extraTagsCount = Math.max(0, item.tags.length - visibleTags.length);

  return (
    <Link
      href={`/items/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-md border border-rule bg-bone transition-colors hover:border-ink/40"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden border-b border-rule bg-shade">
        {coverImage ? (
          <Image
            src={coverImage.url}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-shade px-4 text-center text-faint">
            <svg
              className="h-7 w-7 text-faint"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.25}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            <span className="font-mono text-[10px] tracking-[0.12em] text-sepia uppercase">
              Sin fotografía
            </span>
          </div>
        )}

        <span
          className={`stamp absolute top-3 left-3 bg-bone/95 ${STATUS_BADGE_CLASSES[item.status]}`}
        >
          {ITEM_STATUS_LABELS[item.status]}
        </span>

        {item.images.length > 1 && (
          <span className="absolute right-3 bottom-3 rounded-sm bg-ink/80 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-bone uppercase">
            {item.images.length} fotos
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 text-base leading-snug font-semibold text-ink transition-colors group-hover:text-cobalt">
          {item.title}
        </h2>

        <p className="mt-1 line-clamp-2 text-sm text-sepia">
          {item.description}
        </p>

        {/* Ficha técnica */}
        <dl className="mt-3 divide-y divide-rule border-y border-rule text-xs">
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <dt className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-sepia uppercase">
              Categoría
            </dt>
            <dd className="min-w-0 truncate text-right font-medium text-cobalt">
              {categoryLabel}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <dt className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-sepia uppercase">
              Hallazgo
            </dt>
            <dd className="min-w-0 truncate text-right font-mono text-ink-soft">
              <time dateTime={item.foundAt}>
                {formatShortDate(item.foundAt)}
              </time>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <dt className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-sepia uppercase">
              Ubicación
            </dt>
            <dd className="min-w-0 truncate text-right font-mono text-ink-soft">
              <span className="text-ink">{item.zoneName}</span>{" "}
              · {item.location.floor} ({item.location.roomOrDetail})
            </dd>
          </div>
        </dl>

        {item.custody.mode === "campus_safe_point" &&
          item.custody.safePointName && (
            <p className="mt-3 line-clamp-1 border-l-2 border-brick bg-brick-wash px-2.5 py-1 text-xs font-medium text-brick-deep">
              Entregado en: {item.custody.safePointName}
            </p>
          )}

        {visibleTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-xs border border-rule px-1.5 py-0.5 font-mono text-[11px] text-sepia"
              >
                #{tag}
              </span>
            ))}
            {extraTagsCount > 0 && (
              <span className="rounded-xs border border-rule px-1.5 py-0.5 font-mono text-[11px] text-faint">
                +{extraTagsCount}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-3 border-t border-rule pt-3 text-xs text-sepia">
            <span className="truncate">Por {item.publisherName}</span>
            <span className="shrink-0 font-mono text-[11px]">
              {item.commentsCount}{" "}
              {item.commentsCount === 1 ? "comentario" : "comentarios"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
