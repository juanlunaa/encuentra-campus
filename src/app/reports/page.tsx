import type { Metadata } from "next";
import {
  ReportCharts,
  type ReportFilterValues,
  type ReportsDashboardData,
} from "@/components/ReportCharts";
import { buildErrorPayload } from "@/lib/errors";
import { reportService } from "@/services/report.service";

export const metadata: Metadata = {
  title: "Reportes · Encuentra Campus",
  description:
    "Indicadores y reportes de objetos encontrados y devueltos en la Sede B — Cedesarrollo.",
};

export const dynamic = "force-dynamic";

interface ReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedParams = await searchParams;

  const initialFilters: ReportFilterValues = {
    from: pickSingleParam(resolvedParams.from).trim(),
    to: pickSingleParam(resolvedParams.to).trim(),
    status: pickSingleParam(resolvedParams.status).trim(),
  };

  const rawQuery: Record<string, string> = {};
  if (initialFilters.from) rawQuery.from = initialFilters.from;
  if (initialFilters.to) rawQuery.to = initialFilters.to;
  if (initialFilters.status) rawQuery.status = initialFilters.status;

  let initialData: ReportsDashboardData = {
    byCategory: [],
    topZones: [],
    avgReturnTime: [],
    monthlyTrend: [],
  };
  let initialError: string | null = null;

  try {
    const [byCategory, topZones, avgReturnTime, monthlyTrend] =
      await Promise.all([
        reportService.getByCategory(rawQuery),
        reportService.getTopZones(rawQuery),
        reportService.getAvgReturnTime(rawQuery),
        reportService.getMonthlyTrend(rawQuery),
      ]);

    initialData = {
      byCategory: byCategory.data,
      topZones: topZones.data,
      avgReturnTime: avgReturnTime.data,
      monthlyTrend: monthlyTrend.data,
    };
  } catch (error) {
    initialError = buildErrorPayload(error).body.error.message;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6 border-b border-rule pb-6">
        <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-sepia uppercase">
          Indicadores · Aggregation Framework
        </p>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Reportes e indicadores del campus
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-sepia">
          Métricas consolidadas sobre objetos encontrados y devueltos en la Sede
          B — Cedesarrollo. Filtra por rango de fechas o estado para analizar
          tendencias.
        </p>
      </section>

      <ReportCharts
        initialFilters={initialFilters}
        initialData={initialData}
        initialError={initialError}
      />
    </main>
  );
}
