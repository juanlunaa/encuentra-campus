"use client";

import { useState, type FormEvent } from "react";
import {
  ITEM_STATUSES,
  ITEM_STATUS_LABELS,
} from "@/lib/catalogs";
import type {
  AvgReturnTimeReportRow,
  CategorySummaryReportRow,
  MonthlyTrendReportRow,
  TopZoneReportRow,
} from "@/types/report";

export interface ReportFilterValues {
  from: string;
  to: string;
  status: string;
}

export interface ReportsDashboardData {
  byCategory: CategorySummaryReportRow[];
  topZones: TopZoneReportRow[];
  avgReturnTime: AvgReturnTimeReportRow[];
  monthlyTrend: MonthlyTrendReportRow[];
}

interface ReportChartsProps {
  initialFilters: ReportFilterValues;
  initialData: ReportsDashboardData;
  initialError?: string | null;
}

interface ApiReportResponse<T> {
  data?: T[];
  isEmpty?: boolean;
  error?: {
    message?: string;
  };
}

const MONTH_NAMES_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function formatMonthLabel(monthKey: string): string {
  const [year, monthStr] = monthKey.split("-");
  const monthIdx = Number(monthStr) - 1;
  if (!year || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return monthKey;
  }
  return `${MONTH_NAMES_ES[monthIdx]} ${year.slice(-2)}`;
}

function formatMonthFull(monthKey: string): string {
  const [year, monthStr] = monthKey.split("-");
  const monthIdx = Number(monthStr) - 1;
  if (!year || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return monthKey;
  }
  return `${MONTH_NAMES_ES[monthIdx]} ${year}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
}

function EmptyReportState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-rule-strong bg-paper px-6 py-10 text-center">
      <svg
        className="mb-3 h-9 w-9 text-faint"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
      <p className="text-sm font-medium text-ink-soft">{message}</p>
      <p className="mt-1 text-xs text-sepia">
        Prueba ampliando el rango de fechas o seleccionando otro estado.
      </p>
    </div>
  );
}

export function ReportCharts({
  initialFilters,
  initialData,
  initialError = null,
}: ReportChartsProps) {
  const [filters, setFilters] = useState<ReportFilterValues>(initialFilters);
  const [data, setData] = useState<ReportsDashboardData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  const hasActiveFilters = Boolean(
    filters.from || filters.to || filters.status,
  );

  async function fetchAllReports(nextFilters: ReportFilterValues) {
    setIsLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    if (nextFilters.from) params.set("from", nextFilters.from);
    if (nextFilters.to) params.set("to", nextFilters.to);
    if (nextFilters.status) params.set("status", nextFilters.status);

    const qs = params.toString();
    const suffix = qs ? `?${qs}` : "";

    if (typeof window !== "undefined") {
      const nextUrl = qs ? `/reports?${qs}` : "/reports";
      window.history.replaceState(null, "", nextUrl);
    }

    try {
      const [catRes, zonesRes, avgRes, trendRes] = await Promise.all([
        fetch(`/api/reports/by-category${suffix}`, { cache: "no-store" }),
        fetch(`/api/reports/top-zones${suffix}`, { cache: "no-store" }),
        fetch(`/api/reports/avg-return-time${suffix}`, { cache: "no-store" }),
        fetch(`/api/reports/monthly-trend${suffix}`, { cache: "no-store" }),
      ]);

      const [catJson, zonesJson, avgJson, trendJson] = (await Promise.all([
        catRes.json(),
        zonesRes.json(),
        avgRes.json(),
        trendRes.json(),
      ])) as [
        ApiReportResponse<CategorySummaryReportRow>,
        ApiReportResponse<TopZoneReportRow>,
        ApiReportResponse<AvgReturnTimeReportRow>,
        ApiReportResponse<MonthlyTrendReportRow>,
      ];

      const failed = [
        { res: catRes, json: catJson },
        { res: zonesRes, json: zonesJson },
        { res: avgRes, json: avgJson },
        { res: trendRes, json: trendJson },
      ].find((item) => !item.res.ok);

      if (failed) {
        setErrorMessage(
          failed.json.error?.message ??
            "No fue posible cargar los reportes con los filtros seleccionados.",
        );
        return;
      }

      setData({
        byCategory: catJson.data ?? [],
        topZones: zonesJson.data ?? [],
        avgReturnTime: avgJson.data ?? [],
        monthlyTrend: trendJson.data ?? [],
      });
    } catch {
      setErrorMessage(
        "Ocurrió un error de conexión al consultar los reportes. Intenta nuevamente.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) {
      setErrorMessage(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
      return;
    }
    void fetchAllReports(filters);
  }

  function handleReset() {
    const empty: ReportFilterValues = { from: "", to: "", status: "" };
    setFilters(empty);
    void fetchAllReports(empty);
  }

  const totalFound = data.byCategory.reduce((acc, row) => acc + row.totalFound, 0);
  const totalReturned = data.byCategory.reduce(
    (acc, row) => acc + row.totalReturned,
    0,
  );
  const overallReturnRate =
    totalFound > 0 ? (totalReturned / totalFound) * 100 : 0;

  const totalAvgCount = data.avgReturnTime.reduce(
    (acc, row) => acc + row.returnedCount,
    0,
  );
  const weightedAvgHours =
    totalAvgCount > 0
      ? data.avgReturnTime.reduce(
          (acc, row) => acc + row.avgReturnHours * row.returnedCount,
          0,
        ) / totalAvgCount
      : null;

  const maxCategoryFound = Math.max(
    1,
    ...data.byCategory.map((row) => row.totalFound),
  );
  const maxZoneFound = Math.max(
    1,
    ...data.topZones.map((row) => row.totalFound),
  );
  const maxAvgHours = Math.max(
    1,
    ...data.avgReturnTime.map((row) => row.avgReturnHours),
  );
  const maxMonthlyCount = Math.max(
    1,
    ...data.monthlyTrend.map((row) => Math.max(row.totalFound, row.totalReturned)),
  );

  return (
    <div className="space-y-6">
      {/* Barra de filtros */}
      <form
        onSubmit={handleSubmit}
        className="rounded-md border border-rule bg-bone p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="report-from"
              className="mb-1.5 block font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase"
            >
              Desde
            </label>
            <input
              id="report-from"
              name="from"
              type="date"
              value={filters.from}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, from: e.target.value }))
              }
              className="w-full rounded-sm border border-rule-strong bg-bone px-3 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="report-to"
              className="mb-1.5 block font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase"
            >
              Hasta
            </label>
            <input
              id="report-to"
              name="to"
              type="date"
              value={filters.to}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, to: e.target.value }))
              }
              className="w-full rounded-sm border border-rule-strong bg-bone px-3 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="report-status"
              className="mb-1.5 block font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase"
            >
              Estado
            </label>
            <select
              id="report-status"
              name="status"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="w-full rounded-sm border border-rule-strong bg-bone px-3 py-2 text-sm text-ink focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 focus:outline-none"
            >
              <option value="">Todos los estados</option>
              {ITEM_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ITEM_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 cursor-pointer rounded-sm bg-cobalt px-4 py-2 text-sm font-semibold text-bone transition hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Actualizando..." : "Aplicar filtros"}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-shade disabled:opacity-60"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </form>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-alert-line bg-alert-wash px-4 py-3 text-sm text-alert"
        >
          {errorMessage}
        </div>
      )}

      {/* Tarjetas de resumen KPI */}
      <section
        aria-label="Indicadores generales"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-sm border border-l-2 border-rule border-l-ink bg-bone px-4 py-3.5">
          <p className="font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase">
            Objetos encontrados
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-ink tabular-nums">
            {formatNumber(totalFound)}
          </p>
          <p className="mt-0.5 text-xs text-sepia">
            Según los filtros aplicados
          </p>
        </div>

        <div className="rounded-sm border border-l-2 border-rule border-l-cobalt bg-bone px-4 py-3.5">
          <p className="font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase">
            Objetos devueltos
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-cobalt tabular-nums">
            {formatNumber(totalReturned)}
          </p>
          <p className="mt-0.5 text-xs text-sepia">
            Entregas confirmadas a dueños
          </p>
        </div>

        <div className="rounded-sm border border-l-2 border-rule border-l-cobalt bg-bone px-4 py-3.5">
          <p className="font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase">
            Tasa de devolución
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-ink tabular-nums">
            {formatDecimal(overallReturnRate)}%
          </p>
          <p className="mt-0.5 text-xs text-sepia">
            Devueltos frente a encontrados
          </p>
        </div>

        <div className="rounded-sm border border-l-2 border-rule border-l-brick bg-bone px-4 py-3.5">
          <p className="font-mono text-[10px] font-medium tracking-[0.12em] text-sepia uppercase">
            Tiempo promedio de entrega
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-ink tabular-nums">
            {weightedAvgHours !== null
              ? `${formatDecimal(weightedAvgHours)} h`
              : "Sin datos"}
          </p>
          <p className="mt-0.5 text-xs text-sepia">
            {weightedAvgHours !== null
              ? `≈ ${formatDecimal(weightedAvgHours / 24)} días promedio`
              : "Sin objetos devueltos en el filtro"}
          </p>
        </div>
      </section>

      {/* Grid de Reportes 1 y 2 */}
      <div
        className={`grid grid-cols-1 gap-6 lg:grid-cols-2 ${
          isLoading ? "opacity-60 transition-opacity" : ""
        }`}
      >
        {/* Reporte 1: Resumen por categoría */}
        <section className="rounded-md border border-rule bg-bone p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-ink">
              1. Resumen por categoría
            </h2>
            <p className="text-xs text-sepia">
              Total de objetos encontrados, devueltos y tasa de recuperación por
              categoría.
            </p>
          </div>

          {data.byCategory.length === 0 ? (
            <EmptyReportState message="No hay registros por categoría para los filtros seleccionados." />
          ) : (
            <div className="space-y-5">
              {/* Barras horizontales */}
              <div className="space-y-3">
                {data.byCategory.map((row) => {
                  const foundPct = (row.totalFound / maxCategoryFound) * 100;
                  const returnedPct =
                    (row.totalReturned / maxCategoryFound) * 100;
                  return (
                    <div key={row.category} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-medium text-ink">
                          {row.category}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-sepia">
                          <strong>{formatNumber(row.totalFound)}</strong> enc. ·{" "}
                          <strong className="text-cobalt">
                            {formatNumber(row.totalReturned)}
                          </strong>{" "}
                          dev. ({formatDecimal(row.returnRate)}%)
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden bg-shade">
                        <div
                          className="absolute inset-y-0 left-0 bg-stone transition-all"
                          style={{ width: `${foundPct}%` }}
                          title={`Encontrados: ${row.totalFound}`}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-cobalt transition-all"
                          style={{ width: `${returnedPct}%` }}
                          title={`Devueltos: ${row.totalReturned}`}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 pt-1 text-xs text-sepia">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-stone" />
                    Encontrados
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-cobalt" />
                    Devueltos
                  </span>
                </div>
              </div>

              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-rule text-sepia">
                      <th className="py-2 pr-3 font-medium font-mono text-[10px] tracking-[0.1em] uppercase">Categoría</th>
                      <th className="px-2 py-2 text-right font-medium font-mono text-[10px] tracking-[0.1em] uppercase">
                        Encontrados
                      </th>
                      <th className="px-2 py-2 text-right font-medium font-mono text-[10px] tracking-[0.1em] uppercase">
                        Devueltos
                      </th>
                      <th className="py-2 pl-2 text-right font-medium font-mono text-[10px] tracking-[0.1em] uppercase">
                        % Dev.
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule text-ink-soft">
                    {data.byCategory.map((row) => (
                      <tr key={row.category}>
                        <td className="py-2 pr-3 font-medium text-ink">
                          {row.category}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">
                          {formatNumber(row.totalFound)}
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-cobalt font-mono tabular-nums">
                          {formatNumber(row.totalReturned)}
                        </td>
                        <td className="py-2 pl-2 text-right font-mono tabular-nums">
                          {formatDecimal(row.returnRate)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Reporte 2: Top 5 zonas del campus */}
        <section className="rounded-md border border-rule bg-bone p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-ink">
              2. Top 5 zonas del campus
            </h2>
            <p className="text-xs text-sepia">
              Bloques y áreas de Sede B — Cedesarrollo con mayor número de
              objetos encontrados.
            </p>
          </div>

          {data.topZones.length === 0 ? (
            <EmptyReportState message="No hay hallazgos registrados por zona para los filtros seleccionados." />
          ) : (
            <div className="space-y-5">
              <div className="space-y-3.5">
                {data.topZones.map((row, index) => {
                  const widthPct = (row.totalFound / maxZoneFound) * 100;
                  const returnedPct = (row.totalReturned / maxZoneFound) * 100;
                  return (
                    <div key={row.zoneId} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-xs border border-cobalt-line font-mono text-[10px] font-semibold text-cobalt">
                            {index + 1}
                          </span>
                          <span className="truncate font-medium text-ink">
                            {row.zoneName}
                          </span>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-sepia">
                          <strong>{formatNumber(row.totalFound)}</strong> enc. ·{" "}
                          <strong className="text-cobalt">
                            {formatNumber(row.totalReturned)}
                          </strong>{" "}
                          dev.
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden bg-shade">
                        <div
                          className="absolute inset-y-0 left-0 bg-stone transition-all"
                          style={{ width: `${widthPct}%` }}
                          title={`Encontrados: ${row.totalFound}`}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-cobalt transition-all"
                          style={{ width: `${returnedPct}%` }}
                          title={`Devueltos: ${row.totalReturned}`}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 pt-1 text-xs text-sepia">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-stone" />
                    Encontrados
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-cobalt" />
                    Devueltos
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-rule text-sepia">
                      <th className="py-2 pr-2 font-medium font-mono text-[10px] tracking-[0.1em] uppercase">#</th>
                      <th className="px-2 py-2 font-medium font-mono text-[10px] tracking-[0.1em] uppercase">Zona</th>
                      <th className="px-2 py-2 text-right font-medium font-mono text-[10px] tracking-[0.1em] uppercase">
                        Encontrados
                      </th>
                      <th className="py-2 pl-2 text-right font-medium font-mono text-[10px] tracking-[0.1em] uppercase">
                        Devueltos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule text-ink-soft">
                    {data.topZones.map((row, index) => (
                      <tr key={row.zoneId}>
                        <td className="py-2 pr-2 font-mono text-sepia">
                          {index + 1}
                        </td>
                        <td className="px-2 py-2 font-medium text-ink">
                          {row.zoneName}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">
                          {formatNumber(row.totalFound)}
                        </td>
                        <td className="py-2 pl-2 text-right font-medium text-cobalt font-mono tabular-nums">
                          {formatNumber(row.totalReturned)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Reporte 3: Tiempo promedio de devolución */}
      <section
        className={`rounded-md border border-rule bg-bone p-5 ${
          isLoading ? "opacity-60 transition-opacity" : ""
        }`}
      >
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              3. Tiempo promedio de devolución por categoría
            </h2>
            <p className="text-xs text-sepia">
              Horas y días promedio transcurridos entre el hallazgo y la entrega
              efectiva (solo objetos en estado Devuelto).
            </p>
          </div>
          {filters.status && filters.status !== "devuelto" && (
            <span className="stamp w-fit text-ochre">
              Filtro de estado actual: {ITEM_STATUS_LABELS[filters.status as keyof typeof ITEM_STATUS_LABELS] ?? filters.status}
            </span>
          )}
        </div>

        {data.avgReturnTime.length === 0 ? (
          <EmptyReportState message="Sin devoluciones registradas para calcular tiempos promedio con los filtros seleccionados." />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Barras de horas */}
            <div className="space-y-3">
              {data.avgReturnTime.map((row) => {
                const widthPct = (row.avgReturnHours / maxAvgHours) * 100;
                return (
                  <div key={row.category} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-ink">
                        {row.category}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-sepia">
                        <strong>{formatDecimal(row.avgReturnHours)} h</strong>{" "}
                        ({formatDecimal(row.avgReturnDays)} días)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden bg-shade">
                      <div
                        className="h-full bg-brick transition-all"
                        style={{ width: `${widthPct}%` }}
                        title={`${row.avgReturnHours} horas (${row.returnedCount} devoluciones)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabla resumen */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-rule text-sepia">
                    <th className="py-2 pr-3 font-medium font-mono text-[10px] tracking-[0.1em] uppercase">Categoría</th>
                    <th className="px-2 py-2 text-right font-medium font-mono text-[10px] tracking-[0.1em] uppercase">
                      Devueltos
                    </th>
                    <th className="px-2 py-2 text-right font-medium font-mono text-[10px] tracking-[0.1em] uppercase">
                      Promedio (horas)
                    </th>
                    <th className="py-2 pl-2 text-right font-medium font-mono text-[10px] tracking-[0.1em] uppercase">
                      Promedio (días)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule text-ink-soft">
                  {data.avgReturnTime.map((row) => (
                    <tr key={row.category}>
                      <td className="py-2 pr-3 font-medium text-ink">
                        {row.category}
                      </td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">
                        {formatNumber(row.returnedCount)}
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-brick font-mono tabular-nums">
                        {formatDecimal(row.avgReturnHours)} h
                      </td>
                      <td className="py-2 pl-2 text-right font-mono tabular-nums">
                        {formatDecimal(row.avgReturnDays)} d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Reporte 4: Evolución mensual */}
      <section
        className={`rounded-md border border-rule bg-bone p-5 ${
          isLoading ? "opacity-60 transition-opacity" : ""
        }`}
      >
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              4. Evolución mensual
            </h2>
            <p className="text-xs text-sepia">
              Comparativo mes a mes de objetos encontrados frente a objetos
              devueltos.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-sepia">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 bg-stone" />
              Encontrados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 bg-cobalt" />
              Devueltos
            </span>
          </div>
        </div>

        {data.monthlyTrend.length === 0 ? (
          <EmptyReportState message="No hay datos mensuales disponibles para el rango de fechas seleccionado." />
        ) : (
          <div className="space-y-6">
            {/* Gráfico de barras verticales agrupadas */}
            <div className="overflow-x-auto pb-2">
              <div
                className="flex h-56 items-end gap-3 border-b border-rule px-2 pt-4"
                style={{
                  minWidth: `${Math.max(520, data.monthlyTrend.length * 56)}px`,
                }}
              >
                {data.monthlyTrend.map((row) => {
                  const foundHeightPct =
                    (row.totalFound / maxMonthlyCount) * 100;
                  const returnedHeightPct =
                    (row.totalReturned / maxMonthlyCount) * 100;
                  return (
                    <div
                      key={row.month}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <div className="flex h-44 w-full items-end justify-center gap-1">
                        <div
                          className="w-2.5 bg-stone transition-all hover:bg-sepia sm:w-3"
                          style={{
                            height: `${Math.max(foundHeightPct, row.totalFound > 0 ? 4 : 0)}%`,
                          }}
                          title={`${formatMonthFull(row.month)} · Encontrados: ${row.totalFound}`}
                        />
                        <div
                          className="w-2.5 bg-cobalt transition-all hover:bg-cobalt-deep sm:w-3"
                          style={{
                            height: `${Math.max(returnedHeightPct, row.totalReturned > 0 ? 4 : 0)}%`,
                          }}
                          title={`${formatMonthFull(row.month)} · Devueltos: ${row.totalReturned}`}
                        />
                      </div>
                      <span className="font-mono text-[10px] whitespace-nowrap text-sepia">
                        {formatMonthLabel(row.month)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabla mensual */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-rule text-sepia">
                    <th className="py-2 pr-3 font-medium font-mono text-[10px] tracking-[0.1em] uppercase">Mes</th>
                    <th className="px-2 py-2 text-right font-medium font-mono text-[10px] tracking-[0.1em] uppercase">
                      Encontrados
                    </th>
                    <th className="px-2 py-2 text-right font-medium font-mono text-[10px] tracking-[0.1em] uppercase">
                      Devueltos
                    </th>
                    <th className="py-2 pl-2 text-right font-medium font-mono text-[10px] tracking-[0.1em] uppercase">
                      % Devolución
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule text-ink-soft">
                  {data.monthlyTrend.map((row) => {
                    const rate =
                      row.totalFound > 0
                        ? (row.totalReturned / row.totalFound) * 100
                        : 0;
                    return (
                      <tr key={row.month}>
                        <td className="py-2 pr-3 font-medium text-ink">
                          {formatMonthFull(row.month)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">
                          {formatNumber(row.totalFound)}
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-cobalt font-mono tabular-nums">
                          {formatNumber(row.totalReturned)}
                        </td>
                        <td className="py-2 pl-2 text-right font-mono tabular-nums">
                          {formatDecimal(rate)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
