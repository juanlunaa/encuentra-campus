import { z } from "zod";
import { ITEM_STATUSES } from "@/lib/catalogs";
import type { ReportFilters } from "@/types/report";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDateInput(value: unknown, endOfDayIfDateOnly: boolean): unknown {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (endOfDayIfDateOnly && DATE_ONLY_REGEX.test(trimmed)) {
      return new Date(`${trimmed}T23:59:59.999Z`);
    }
    if (!endOfDayIfDateOnly && DATE_ONLY_REGEX.test(trimmed)) {
      return new Date(`${trimmed}T00:00:00.000Z`);
    }
    return new Date(trimmed);
  }
  return value;
}

const optionalDateSchema = (endOfDayIfDateOnly: boolean) =>
  z.preprocess(
    (value) => parseDateInput(value, endOfDayIfDateOnly),
    z
      .date({ error: "El filtro de fecha no tiene un formato válido." })
      .refine((date) => !Number.isNaN(date.getTime()), {
        message: "El filtro de fecha no es válido.",
      })
      .optional(),
  );

export const reportFiltersSchema = z
  .object({
    from: optionalDateSchema(false),
    to: optionalDateSchema(true),
    status: z
      .enum(ITEM_STATUSES, {
        error: "El estado seleccionado para el reporte no es válido.",
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && data.from.getTime() > data.to.getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["from"],
        message: "La fecha inicial no puede ser posterior a la fecha final.",
      });
    }
  });

export function validateReportFilters(input: unknown): ReportFilters {
  return reportFiltersSchema.parse(input);
}

export function extractReportQueryParams(
  request: Request,
): Record<string, string> {
  const { searchParams } = new URL(request.url);
  const rawQuery: Record<string, string> = {};

  for (const key of ["from", "to", "status"]) {
    const value = searchParams.get(key);
    if (value !== null && value.trim() !== "") {
      rawQuery[key] = value.trim();
    }
  }

  return rawQuery;
}
