import Link from "next/link";
import { ItemCard } from "@/components/ItemCard";
import {
  ItemFilters,
  type ItemFiltersValues,
} from "@/components/ItemFilters";
import { buildErrorPayload } from "@/lib/errors";
import { toCampusZoneDTO, zoneRepository } from "@/repositories/zone.repository";
import { foundItemService } from "@/services/found-item.service";
import type { PaginatedItemsResponse } from "@/types/found-item";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickSingleParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function buildPageHref(
  filters: ItemFiltersValues,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    const cleaned = value.trim();
    if (cleaned) params.set(key, cleaned);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedParams = await searchParams;

  const filterValues: ItemFiltersValues = {
    query: pickSingleParam(resolvedParams.query),
    category: pickSingleParam(resolvedParams.category),
    zoneId: pickSingleParam(resolvedParams.zoneId),
    status: pickSingleParam(resolvedParams.status),
    tag: pickSingleParam(resolvedParams.tag),
    from: pickSingleParam(resolvedParams.from),
    to: pickSingleParam(resolvedParams.to),
  };

  const rawPage = pickSingleParam(resolvedParams.page);

  const rawQuery: Record<string, string> = {};
  for (const [key, value] of Object.entries(filterValues)) {
    if (value.trim()) rawQuery[key] = value.trim();
  }
  if (rawPage.trim()) {
    rawQuery.page = rawPage.trim();
  }

  const zonesDocs = await zoneRepository.findActive();
  const zones = zonesDocs.map(toCampusZoneDTO);

  let data: PaginatedItemsResponse = {
    items: [],
    pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
  };
  let errorMessage: string | null = null;

  try {
    data = await foundItemService.list(rawQuery);
  } catch (error) {
    errorMessage = buildErrorPayload(error).body.error.message;
  }

  const { items, pagination } = data;
  const startIndex =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;
  const endIndex = Math.min(
    pagination.total,
    pagination.page * pagination.limit,
  );

  const hasActiveFilters = Object.values(filterValues).some(
    (v) => v.trim().length > 0,
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6 flex flex-col justify-between gap-4 border-b border-rule pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-sepia uppercase">
            Archivo de hallazgos · Sede B
          </p>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            Objetos encontrados en el campus
          </h1>
          <p className="mt-2 max-w-xl text-sm text-sepia">
            Explora los reportes recientes en la Sede B — Cedesarrollo y filtra
            por zona, categoría, estado o fecha.
          </p>
        </div>

        <Link
          href="/items/new"
          className="inline-flex shrink-0 items-center justify-center rounded-sm bg-cobalt px-4 py-2.5 text-sm font-semibold text-bone transition hover:bg-cobalt-deep"
        >
          + Publicar objeto encontrado
        </Link>
      </section>

      <section aria-label="Filtros de búsqueda">
        <ItemFilters zones={zones} initialValues={filterValues} />
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="mt-6 rounded-md border border-alert-line bg-alert-wash px-4 py-3 text-sm text-alert"
        >
          {errorMessage}
        </div>
      )}

      <section className="mt-6" aria-label="Resultados de publicaciones">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-sepia">
          <p>
            {pagination.total > 0 ? (
              <>
                Mostrando{" "}
                <strong className="font-semibold text-ink">
                  {startIndex}–{endIndex}
                </strong>{" "}
                de{" "}
                <strong className="font-semibold text-ink">
                  {pagination.total}
                </strong>{" "}
                {pagination.total === 1 ? "publicación" : "publicaciones"}
              </>
            ) : (
              "0 publicaciones encontradas"
            )}
          </p>
          {pagination.totalPages > 1 && (
            <p className="text-xs text-sepia">
              Página {pagination.page} de {pagination.totalPages}
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-rule-strong bg-bone px-6 py-14 text-center">
            <h2 className="font-serif text-xl font-medium text-ink">
              Sin resultados
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-sepia">
              {hasActiveFilters
                ? "No encontramos publicaciones que coincidan con los filtros seleccionados. Intenta ajustar tu búsqueda o limpiar los filtros."
                : "Aún no hay objetos encontrados publicados en el campus."}
            </p>
            {hasActiveFilters && (
              <Link
                href="/"
                className="mt-5 inline-flex rounded-sm border border-rule-strong bg-bone px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-shade"
              >
                Limpiar filtros y ver todo
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <nav
            aria-label="Paginación"
            className="mt-8 flex items-center justify-between border-t border-rule pt-5"
          >
            {pagination.page > 1 ? (
              <Link
                href={buildPageHref(filterValues, pagination.page - 1)}
                className="rounded-sm border border-rule-strong bg-bone px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:bg-shade"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="rounded-sm border border-rule bg-paper px-3.5 py-2 text-sm font-medium text-faint">
                ← Anterior
              </span>
            )}

            <span className="font-mono text-xs text-sepia">
              Página{" "}
              <strong className="font-semibold text-ink">
                {pagination.page}
              </strong>{" "}
              de{" "}
              <strong className="font-semibold text-ink">
                {pagination.totalPages}
              </strong>
            </span>

            {pagination.page < pagination.totalPages ? (
              <Link
                href={buildPageHref(filterValues, pagination.page + 1)}
                className="rounded-sm border border-rule-strong bg-bone px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:bg-shade"
              >
                Siguiente →
              </Link>
            ) : (
              <span className="rounded-sm border border-rule bg-paper px-3.5 py-2 text-sm font-medium text-faint">
                Siguiente →
              </span>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}
