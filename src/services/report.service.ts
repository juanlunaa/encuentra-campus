import type { ItemStatus } from "@/lib/catalogs";
import { reportRepository } from "@/repositories/report.repository";
import type {
  AvgReturnTimeReportRow,
  CategorySummaryReportRow,
  MonthlyTrendReportRow,
  ReportFilters,
  TopZoneReportRow,
} from "@/types/report";
import { validateReportFilters } from "@/validators/report.validator";

export interface SerializedReportFilters {
  from: string | null;
  to: string | null;
  status: ItemStatus | null;
}

export interface ReportResult<TRow> {
  filters: SerializedReportFilters;
  data: TRow[];
  isEmpty: boolean;
}

function serializeFilters(filters: ReportFilters): SerializedReportFilters {
  return {
    from: filters.from ? filters.from.toISOString() : null,
    to: filters.to ? filters.to.toISOString() : null,
    status: filters.status ?? null,
  };
}

function buildResult<TRow>(
  filters: ReportFilters,
  data: TRow[],
): ReportResult<TRow> {
  return {
    filters: serializeFilters(filters),
    data,
    isEmpty: data.length === 0,
  };
}

export async function getByCategoryReport(
  rawFilters: unknown,
): Promise<ReportResult<CategorySummaryReportRow>> {
  const filters = validateReportFilters(rawFilters);
  const data = await reportRepository.aggregateByCategory(filters);
  return buildResult(filters, data);
}

export async function getTopZonesReport(
  rawFilters: unknown,
): Promise<ReportResult<TopZoneReportRow>> {
  const filters = validateReportFilters(rawFilters);
  const data = await reportRepository.aggregateTopZones(filters);
  return buildResult(filters, data);
}

export async function getAvgReturnTimeReport(
  rawFilters: unknown,
): Promise<ReportResult<AvgReturnTimeReportRow>> {
  const filters = validateReportFilters(rawFilters);
  const data = await reportRepository.aggregateAvgReturnTime(filters);
  return buildResult(filters, data);
}

export async function getMonthlyTrendReport(
  rawFilters: unknown,
): Promise<ReportResult<MonthlyTrendReportRow>> {
  const filters = validateReportFilters(rawFilters);
  const data = await reportRepository.aggregateMonthlyTrend(filters);
  return buildResult(filters, data);
}

export const reportService = {
  getByCategory: getByCategoryReport,
  getTopZones: getTopZonesReport,
  getAvgReturnTime: getAvgReturnTimeReport,
  getMonthlyTrend: getMonthlyTrendReport,
};
