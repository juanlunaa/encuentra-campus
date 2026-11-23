import type { ItemStatus } from "@/lib/catalogs";

export interface ReportFilters {
  from?: Date;
  to?: Date;
  status?: ItemStatus;
}

export interface CategorySummaryReportRow {
  category: string;
  totalFound: number;
  totalReturned: number;
  returnRate: number;
}

export interface TopZoneReportRow {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  totalFound: number;
  totalReturned: number;
}

export interface AvgReturnTimeReportRow {
  category: string;
  returnedCount: number;
  avgReturnHours: number;
  avgReturnDays: number;
}

export interface MonthlyTrendReportRow {
  month: string;
  totalFound: number;
  totalReturned: number;
}
