"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  CLAIM_STATUSES,
  CLAIM_STATUS_LABELS,
  ITEM_STATUSES,
  ITEM_STATUS_LABELS,
} from "@/lib/catalogs";
import type {
  ActivityClaimSummaryDTO,
  ActivityCountsDTO,
  ActivityItemSummaryDTO,
  ActivityPaginationDTO,
  ActivityTab,
  PaginatedActivityClaimsResponse,
  PaginatedActivityItemsResponse,
} from "@/types/activity";
import { ActivityClaimCard } from "@/components/activity/ActivityClaimCard";
import { ActivityItemCard } from "@/components/activity/ActivityItemCard";

interface ActivityClientProps {
  initialTab: ActivityTab;
  initialItemsResponse: PaginatedActivityItemsResponse | null;
  initialClaimsResponse: PaginatedActivityClaimsResponse | null;
  initialCounts: ActivityCountsDTO;
  initialQuery: string;
  initialStatus: string;
  initialHasPendingClaims: boolean;
  initialPage: number;
}

interface FetchParams {
  tab: ActivityTab;
  query: string;
  status: string;
  hasPendingClaims: boolean;
  page: number;
}

interface ApiErrorShape {
  error?: {
    message?: string;
  };
}

const DEFAULT_LIMIT = 10;

const EMPTY_PAGINATION: ActivityPaginationDTO = {
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 0,
};

function buildUrlSearchParams(params: FetchParams): string {
  const sp = new URLSearchParams();
  if (params.tab === "claims") {
    sp.set("tab", "claims");
  }
  const trimmedQuery = params.query.trim();
  if (trimmedQuery) {
    sp.set("query", trimmedQuery);
  }
  if (params.status) {
    sp.set("status", params.status);
  }
  if (params.tab === "items" && params.hasPendingClaims) {
    sp.set("hasPendingClaims", "true");
  }
  if (params.page > 1) {
    sp.set("page", String(params.page));
  }
  return sp.toString();
}

function buildApiUrl(params: FetchParams): string {
  const sp = new URLSearchParams();
  const trimmedQuery = params.query.trim();
  if (trimmedQuery) {
    sp.set("query", trimmedQuery);
  }
  if (params.status) {
    sp.set("status", params.status);
  }
  if (params.tab === "items" && params.hasPendingClaims) {
    sp.set("hasPendingClaims", "true");
  }
  sp.set("page", String(params.page));
  sp.set("limit", String(DEFAULT_LIMIT));

  const endpoint =
    params.tab === "items" ? "/api/activity/items" : "/api/activity/claims";
  return `${endpoint}?${sp.toString()}`;
}

export function ActivityClient({
  initialTab,
  initialItemsResponse,
  initialClaimsResponse,
  initialCounts,
  initialQuery,
  initialStatus,
  initialHasPendingClaims,
  initialPage,
}: ActivityClientProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>(initialTab);
  const [queryInput, setQueryInput] = useState<string>(initialQuery);
  const [appliedQuery, setAppliedQuery] = useState<string>(initialQuery);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [hasPendingClaims, setHasPendingClaims] = useState<boolean>(
    initialHasPendingClaims,
  );
  const [page, setPage] = useState<number>(initialPage);

  const [counts, setCounts] = useState<ActivityCountsDTO>(initialCounts);
  const [items, setItems] = useState<ActivityItemSummaryDTO[]>(
    initialItemsResponse?.items ?? [],
  );
  const [claims, setClaims] = useState<ActivityClaimSummaryDTO[]>(
    initialClaimsResponse?.claims ?? [],
  );
  const [pagination, setPagination] = useState<ActivityPaginationDTO>(
    initialTab === "items"
      ? (initialItemsResponse?.pagination ?? EMPTY_PAGINATION)
      : (initialClaimsResponse?.pagination ?? EMPTY_PAGINATION),
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestParamsRef = useRef<FetchParams>({
    tab: initialTab,
    query: initialQuery,
    status: initialStatus,
    hasPendingClaims: initialHasPendingClaims,
    page: initialPage,
  });

  const syncBrowserUrl = useCallback((params: FetchParams) => {
    if (typeof window === "undefined") return;
    const qs = buildUrlSearchParams(params);
    const nextUrl = qs ? `/activity?${qs}` : "/activity";
    window.history.replaceState(null, "", nextUrl);
  }, []);

  const fetchActivity = useCallback(
    async (params: FetchParams) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      lastRequestParamsRef.current = params;

      setIsLoading(true);
      setErrorMessage(null);
      syncBrowserUrl(params);

      try {
        const response = await fetch(buildApiUrl(params), {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          setSessionExpired(true);
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          let message =
            "No pudimos cargar tu actividad en este momento. Intenta nuevamente.";
          try {
            const payload = (await response.json()) as ApiErrorShape;
            if (payload?.error?.message) {
              message = payload.error.message;
            }
          } catch {
            // Mantener mensaje amigable por defecto
          }
          setErrorMessage(message);
          setIsLoading(false);
          return;
        }

        if (params.tab === "items") {
          const data =
            (await response.json()) as PaginatedActivityItemsResponse;
          setItems(data.items);
          setPagination(data.pagination);
          setCounts(data.counts);
        } else {
          const data =
            (await response.json()) as PaginatedActivityClaimsResponse;
          setClaims(data.claims);
          setPagination(data.pagination);
          setCounts(data.counts);
        }

        setSessionExpired(false);
        setIsLoading(false);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setErrorMessage(
          "Ocurrió un error de conexión al consultar tu actividad. Verifica tu red e intenta nuevamente.",
        );
        setIsLoading(false);
      }
    },
    [syncBrowserUrl],
  );

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  function cancelPendingDebounce() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }

  function handleTabChange(nextTab: ActivityTab) {
    if (nextTab === activeTab) return;
    cancelPendingDebounce();

    setActiveTab(nextTab);
    setQueryInput("");
    setAppliedQuery("");
    setStatusFilter("");
    setHasPendingClaims(false);
    setPage(1);

    void fetchActivity({
      tab: nextTab,
      query: "",
      status: "",
      hasPendingClaims: false,
      page: 1,
    });
  }

  function handleQueryInputChange(nextValue: string) {
    setQueryInput(nextValue);
    cancelPendingDebounce();

    debounceTimerRef.current = setTimeout(() => {
      const cleaned = nextValue.trim();
      setAppliedQuery(cleaned);
      setPage(1);
      void fetchActivity({
        tab: activeTab,
        query: cleaned,
        status: statusFilter,
        hasPendingClaims,
        page: 1,
      });
    }, 350);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cancelPendingDebounce();
    const cleaned = queryInput.trim();
    setAppliedQuery(cleaned);
    setPage(1);
    void fetchActivity({
      tab: activeTab,
      query: cleaned,
      status: statusFilter,
      hasPendingClaims,
      page: 1,
    });
  }

  function handleStatusChange(nextStatus: string) {
    cancelPendingDebounce();
    const cleanedQuery = queryInput.trim();
    setAppliedQuery(cleanedQuery);
    setStatusFilter(nextStatus);
    setPage(1);

    void fetchActivity({
      tab: activeTab,
      query: cleanedQuery,
      status: nextStatus,
      hasPendingClaims,
      page: 1,
    });
  }

  function handleTogglePendingClaims(nextChecked: boolean) {
    cancelPendingDebounce();
    const cleanedQuery = queryInput.trim();
    setAppliedQuery(cleanedQuery);
    setHasPendingClaims(nextChecked);
    setPage(1);

    void fetchActivity({
      tab: activeTab,
      query: cleanedQuery,
      status: statusFilter,
      hasPendingClaims: nextChecked,
      page: 1,
    });
  }

  function handleClearFilters() {
    cancelPendingDebounce();
    setQueryInput("");
    setAppliedQuery("");
    setStatusFilter("");
    setHasPendingClaims(false);
    setPage(1);

    void fetchActivity({
      tab: activeTab,
      query: "",
      status: "",
      hasPendingClaims: false,
      page: 1,
    });
  }

  function handlePageChange(nextPage: number) {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === page) {
      return;
    }
    cancelPendingDebounce();
    setPage(nextPage);

    void fetchActivity({
      tab: activeTab,
      query: appliedQuery,
      status: statusFilter,
      hasPendingClaims,
      page: nextPage,
    });
  }

  function handleRetry() {
    void fetchActivity(lastRequestParamsRef.current);
  }

  if (sessionExpired) {
    return (
      <section className="rounded-md border border-rule bg-bone p-8 text-center">
        <p className="font-mono text-xs tracking-[0.12em] text-alert uppercase">
          Sesión finalizada
        </p>
        <h2 className="mt-2 font-serif text-2xl font-medium tracking-tight text-ink">
          Tu sesión ha expirado
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-sepia">
          Por seguridad, tu sesión de estudiante finalizó mientras consultabas
          tu actividad. Inicia sesión nuevamente para continuar.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-sm bg-cobalt px-4 py-2.5 text-sm font-semibold text-bone transition hover:bg-cobalt-deep"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-sm border border-rule-strong bg-bone px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-shade"
          >
            Crear cuenta
          </Link>
        </div>
      </section>
    );
  }

  const hasActiveFilters =
    appliedQuery.trim().length > 0 ||
    statusFilter.length > 0 ||
    (activeTab === "items" && hasPendingClaims);

  const currentListLength = activeTab === "items" ? items.length : claims.length;
  const totalForActiveTab =
    activeTab === "items" ? counts.totalItems : counts.totalClaims;

  return (
    <div className="space-y-6">
      {/* Pestañas con contadores informativos internos (RF-10.4) */}
      <div
        role="tablist"
        aria-label="Secciones de Mi actividad"
        className="flex flex-wrap gap-2 border-b border-rule"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "items"}
          onClick={() => handleTabChange("items")}
          className={`flex cursor-pointer items-center gap-2.5 border-b-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "items"
              ? "border-cobalt text-cobalt"
              : "border-transparent text-sepia hover:border-rule-strong hover:text-ink"
          }`}
        >
          <span>Mis publicaciones</span>
          <span
            className={`rounded-sm px-2 py-0.5 font-mono text-xs ${
              activeTab === "items"
                ? "bg-cobalt-wash text-cobalt"
                : "bg-shade text-sepia"
            }`}
          >
            {counts.totalItems}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "claims"}
          onClick={() => handleTabChange("claims")}
          className={`flex cursor-pointer items-center gap-2.5 border-b-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "claims"
              ? "border-cobalt text-cobalt"
              : "border-transparent text-sepia hover:border-rule-strong hover:text-ink"
          }`}
        >
          <span>Mis reclamos</span>
          <span
            className={`rounded-sm px-2 py-0.5 font-mono text-xs ${
              activeTab === "claims"
                ? "bg-cobalt-wash text-cobalt"
                : "bg-shade text-sepia"
            }`}
          >
            {counts.totalClaims}
          </span>
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <form
        onSubmit={handleSearchSubmit}
        className="overflow-hidden rounded-md border border-rule bg-bone"
      >
        <div
          className={`grid grid-cols-1 gap-px bg-rule ${
            activeTab === "items" ? "md:grid-cols-12" : "md:grid-cols-12"
          }`}
        >
          {/* Buscador */}
          <div
            className={`bg-bone px-3.5 py-2.5 transition-colors focus-within:bg-paper focus-within:shadow-[inset_0_-2px_0_0_var(--color-cobalt)] ${
              activeTab === "items" ? "md:col-span-5" : "md:col-span-7"
            }`}
          >
            <label
              htmlFor="activity-search"
              className="block font-mono text-[10px] tracking-[0.12em] text-sepia uppercase"
            >
              {activeTab === "items"
                ? "Buscar en mis publicaciones"
                : "Buscar en mis reclamos"}
            </label>
            <input
              id="activity-search"
              type="search"
              value={queryInput}
              onChange={(e) => handleQueryInputChange(e.target.value)}
              placeholder={
                activeTab === "items"
                  ? "Título, descripción, ubicación o etiquetas..."
                  : "Título del objeto, zona o detalle..."
              }
              className="mt-1 w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
            />
          </div>

          {/* Selector de estado */}
          <div
            className={`bg-bone px-3.5 py-2.5 transition-colors focus-within:bg-paper focus-within:shadow-[inset_0_-2px_0_0_var(--color-cobalt)] ${
              activeTab === "items" ? "md:col-span-3" : "md:col-span-5"
            }`}
          >
            <label
              htmlFor="activity-status"
              className="block font-mono text-[10px] tracking-[0.12em] text-sepia uppercase"
            >
              {activeTab === "items"
                ? "Estado de publicación"
                : "Estado del reclamo"}
            </label>
            <select
              id="activity-status"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="mt-1 w-full cursor-pointer bg-transparent text-sm text-ink focus:outline-none"
            >
              <option value="">Todos los estados</option>
              {activeTab === "items"
                ? ITEM_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {ITEM_STATUS_LABELS[status]}
                    </option>
                  ))
                : CLAIM_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {CLAIM_STATUS_LABELS[status]}
                    </option>
                  ))}
            </select>
          </div>

          {/* Filtro rápido "Con reclamos pendientes" solo en Mis publicaciones */}
          {activeTab === "items" && (
            <div className="flex items-center bg-bone px-3.5 py-2.5 md:col-span-4">
              <label className="flex w-full cursor-pointer items-center gap-2.5 text-sm text-ink-soft select-none">
                <input
                  type="checkbox"
                  checked={hasPendingClaims}
                  onChange={(e) => handleTogglePendingClaims(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded-xs border-rule-strong accent-cobalt"
                />
                <span>Con reclamos pendientes</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-paper px-3.5 py-2.5">
          <p className="font-mono text-xs text-sepia">
            {isLoading
              ? "Actualizando resultados..."
              : pagination.total === 1
                ? "1 resultado encontrado"
                : `${pagination.total} resultados encontrados`}
          </p>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-shade"
              >
                Limpiar filtros
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer rounded-sm bg-cobalt px-3.5 py-1.5 text-xs font-semibold text-bone transition hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              Buscar
            </button>
          </div>
        </div>
      </form>

      {/* Mensaje de error con opción de reintento (RF-15.1) */}
      {errorMessage && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-alert/40 bg-alert/5 px-4 py-3 text-sm text-ink"
        >
          <p className="text-ink-soft">{errorMessage}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="cursor-pointer rounded-sm border border-alert/50 bg-bone px-3 py-1.5 text-xs font-semibold text-alert transition hover:bg-alert/10"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Listado o estados vacíos */}
      {isLoading && currentListLength === 0 ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-36 animate-pulse rounded-md border border-rule bg-paper"
            />
          ))}
        </div>
      ) : currentListLength === 0 ? (
        !errorMessage && (
          <section className="rounded-md border border-rule bg-bone p-8 text-center">
            {totalForActiveTab === 0 && !hasActiveFilters ? (
              activeTab === "items" ? (
                <>
                  <h2 className="font-serif text-xl font-medium text-ink">
                    Aún no has publicado objetos encontrados
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-sepia">
                    Cuando reportes un objeto encontrado en el campus, podrás
                    hacer seguimiento a su estado y a los reclamos pendientes
                    desde aquí.
                  </p>
                  <div className="mt-5">
                    <Link
                      href="/items/new"
                      className="inline-flex rounded-sm bg-cobalt px-4 py-2.5 text-sm font-semibold text-bone transition hover:bg-cobalt-deep"
                    >
                      Publicar un objeto encontrado
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-serif text-xl font-medium text-ink">
                    Aún no has enviado solicitudes de reclamo
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-sepia">
                    Explora los objetos encontrados en el campus; cuando envíes
                    un reclamo podrás revisar aquí su estado y respuesta.
                  </p>
                  <div className="mt-5">
                    <Link
                      href="/"
                      className="inline-flex rounded-sm bg-cobalt px-4 py-2.5 text-sm font-semibold text-bone transition hover:bg-cobalt-deep"
                    >
                      Explorar objetos encontrados
                    </Link>
                  </div>
                </>
              )
            ) : (
              <>
                <h2 className="font-serif text-xl font-medium text-ink">
                  No hay coincidencias con los filtros actuales
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-sepia">
                  Prueba con otro término de búsqueda o limpia los filtros
                  aplicados para ver toda tu actividad.
                </p>
                {hasActiveFilters && (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-shade"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )
      ) : (
        <div
          className={`space-y-3 transition-opacity ${
            isLoading ? "opacity-60" : "opacity-100"
          }`}
        >
          {activeTab === "items"
            ? items.map((item) => <ActivityItemCard key={item.id} item={item} />)
            : claims.map((claim) => (
                <ActivityClaimCard key={claim.id} claim={claim} />
              ))}
        </div>
      )}

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <nav
          aria-label="Paginación de Mi actividad"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4"
        >
          <p className="font-mono text-xs text-sepia">
            Página <strong className="text-ink">{pagination.page}</strong> de{" "}
            <strong className="text-ink">{pagination.totalPages}</strong> ·{" "}
            {pagination.total}{" "}
            {pagination.total === 1 ? "registro" : "registros"}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoading || pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-3.5 py-2 text-xs font-medium text-ink-soft transition hover:bg-shade disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Anterior
            </button>
            <button
              type="button"
              disabled={isLoading || pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-3.5 py-2 text-xs font-medium text-ink-soft transition hover:bg-shade disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
