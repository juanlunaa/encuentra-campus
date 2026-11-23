import { COLLECTIONS, getCollection } from "@/lib/mongodb";
import {
  buildAvgReturnTimePipeline,
  buildByCategoryPipeline,
  buildMonthlyTrendPipeline,
  buildTopZonesPipeline,
} from "@/repositories/report.pipelines";
import type { FoundItemDocument } from "@/types/found-item";
import type {
  AvgReturnTimeReportRow,
  CategorySummaryReportRow,
  MonthlyTrendReportRow,
  ReportFilters,
  TopZoneReportRow,
} from "@/types/report";

export async function aggregateByCategory(
  filters: ReportFilters,
): Promise<CategorySummaryReportRow[]> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const pipeline = buildByCategoryPipeline(filters);
  return collection.aggregate<CategorySummaryReportRow>(pipeline).toArray();
}

export async function aggregateTopZones(
  filters: ReportFilters,
): Promise<TopZoneReportRow[]> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const pipeline = buildTopZonesPipeline(filters);
  return collection.aggregate<TopZoneReportRow>(pipeline).toArray();
}

export async function aggregateAvgReturnTime(
  filters: ReportFilters,
): Promise<AvgReturnTimeReportRow[]> {
  if (filters.status && filters.status !== "devuelto") {
    return [];
  }

  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const pipeline = buildAvgReturnTimePipeline(filters);
  return collection.aggregate<AvgReturnTimeReportRow>(pipeline).toArray();
}

export async function aggregateMonthlyTrend(
  filters: ReportFilters,
): Promise<MonthlyTrendReportRow[]> {
  const collection = await getCollection<FoundItemDocument>(
    COLLECTIONS.foundItems,
  );
  const pipeline = buildMonthlyTrendPipeline(filters);
  return collection.aggregate<MonthlyTrendReportRow>(pipeline).toArray();
}

export const reportRepository = {
  aggregateByCategory,
  aggregateTopZones,
  aggregateAvgReturnTime,
  aggregateMonthlyTrend,
};
