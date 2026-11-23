import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { reportService } from "@/services/report.service";
import { extractReportQueryParams } from "@/validators/report.validator";

export async function GET(request: Request): Promise<Response> {
  try {
    const rawQuery = extractReportQueryParams(request);
    const result = await reportService.getTopZones(rawQuery);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
