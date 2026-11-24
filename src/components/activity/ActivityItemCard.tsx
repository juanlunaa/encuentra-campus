import Image from "next/image";
import Link from "next/link";
import {
  ITEM_STATUS_LABELS,
  OTHER_CATEGORY,
  type ItemStatus,
} from "@/lib/catalogs";
import type { ActivityItemSummaryDTO } from "@/types/activity";

interface ActivityItemCardProps {
  item: ActivityItemSummaryDTO;
}

const ITEM_STATUS_CLASSES: Record<ItemStatus, string> = {
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

export function ActivityItemCard({ item }: ActivityItemCardProps) {
  const categoryLabel =
    item.category === OTHER_CATEGORY && item.customCategory
      ? `Otra: ${item.customCategory}`
      : item.category;

  const hasPending = item.pendingClaimsCount > 0;
  const pendingLabel =
    item.pendingClaimsCount === 1
      ? "1 reclamo pendiente"
      : `${item.pendingClaimsCount} reclamos pendientes`;

  return (
    <Link
      href={`/items/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-md border border-rule bg-bone transition-colors hover:border-ink/40 sm:flex-row"
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-rule bg-shade sm:aspect-auto sm:w-48 sm:border-r sm:border-b-0">
        {item.coverImage ? (
          <Image
            src={item.coverImage.url}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, 192px"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full min-h-[140px] w-full flex-col items-center justify-center gap-1.5 bg-shade px-4 text-center text-faint">
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

        {item.imagesCount > 1 && (
          <span className="absolute right-2.5 bottom-2.5 rounded-sm bg-ink/80 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-bone uppercase">
            {item.imagesCount} fotos
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`stamp bg-paper ${ITEM_STATUS_CLASSES[item.status]}`}
            >
              {ITEM_STATUS_LABELS[item.status]}
            </span>

            {hasPending ? (
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-ochre/40 bg-ochre/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ochre">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-ochre"
                  aria-hidden="true"
                />
                {pendingLabel}
              </span>
            ) : (
              <span className="font-mono text-[11px] text-sepia">
                0 reclamos pendientes
              </span>
            )}
          </div>

          <h2 className="mt-2.5 line-clamp-2 text-base leading-snug font-semibold text-ink transition-colors group-hover:text-cobalt">
            {item.title}
          </h2>

          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-rule pt-2.5 text-xs sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="font-mono text-[10px] tracking-[0.12em] text-sepia uppercase">
                Categoría
              </dt>
              <dd className="mt-0.5 truncate font-medium text-cobalt">
                {categoryLabel}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="font-mono text-[10px] tracking-[0.12em] text-sepia uppercase">
                Zona del campus
              </dt>
              <dd className="mt-0.5 truncate text-ink-soft">
                <span className="font-medium text-ink">{item.zoneName}</span> ·{" "}
                {item.location.floor}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="font-mono text-[10px] tracking-[0.12em] text-sepia uppercase">
                Hallazgo / Publicación
              </dt>
              <dd className="mt-0.5 truncate font-mono text-ink-soft">
                <time dateTime={item.foundAt}>
                  {formatShortDate(item.foundAt)}
                </time>
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-rule pt-2.5 text-xs">
          <span className="truncate text-sepia">
            Publicado el{" "}
            <time dateTime={item.createdAt}>
              {formatShortDate(item.createdAt)}
            </time>
          </span>
          <span className="shrink-0 font-mono text-[11px] font-medium tracking-[0.06em] text-cobalt uppercase group-hover:underline">
            Gestionar en detalle →
          </span>
        </div>
      </div>
    </Link>
  );
}
