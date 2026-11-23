import type { Document } from "mongodb";
import { COLLECTIONS } from "@/lib/mongodb";
import type { ReportFilters } from "@/types/report";

const MILLISECONDS_PER_HOUR = 3_600_000;
const TOP_ZONES_LIMIT = 5;

/**
 * Construye el rango de fechas sobre `foundAt` cuando se reciben `from` y/o `to`.
 */
function buildDateRangeFilter(
  filters: ReportFilters,
): Record<string, Date> | null {
  const range: Record<string, Date> = {};
  if (filters.from) {
    range.$gte = filters.from;
  }
  if (filters.to) {
    range.$lte = filters.to;
  }
  return Object.keys(range).length > 0 ? range : null;
}

/**
 * Construye la etapa `$match` base compartida por los reportes (rango de fechas y estado).
 */
function buildBaseMatch(filters: ReportFilters): Document {
  const match: Document = {};
  const foundAtRange = buildDateRangeFilter(filters);

  if (foundAtRange) {
    match.foundAt = foundAtRange;
  }
  if (filters.status) {
    match.status = filters.status;
  }

  return match;
}

/**
 * REPORTE 1 — Resumen por categoría (`GET /api/reports/by-category`)
 *
 * Pregunta de negocio:
 *   ¿Cuántos objetos encontrados y devueltos hay por categoría y cuál es su tasa de devolución?
 *
 * Operadores de Aggregation Framework:
 *   - $match (opcional según filtros)
 *   - $group ($sum, $cond, $eq)
 *   - $project ($cond, $gt, $round, $multiply, $divide — protegido contra división por cero)
 *   - $sort
 *
 * Índices aprovechados:
 *   - { category: 1, status: 1 } / { status: 1, createdAt: -1 }
 */
export function buildByCategoryPipeline(filters: ReportFilters): Document[] {
  const matchStage = buildBaseMatch(filters);
  const pipeline: Document[] = [];

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push(
    {
      $group: {
        _id: "$category",
        totalFound: { $sum: 1 },
        totalReturned: {
          $sum: {
            $cond: [{ $eq: ["$status", "devuelto"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        totalFound: 1,
        totalReturned: 1,
        returnRate: {
          $cond: [
            { $gt: ["$totalFound", 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$totalReturned", "$totalFound"] },
                    100,
                  ],
                },
                2,
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $sort: { totalFound: -1, category: 1 },
    },
  );

  return pipeline;
}

/**
 * REPORTE 2 — Top 5 zonas del campus (`GET /api/reports/top-zones`)
 *
 * Pregunta de negocio:
 *   ¿Cuáles son las 5 zonas de Sede B — Cedesarrollo donde más objetos se encuentran?
 *
 * Operadores de Aggregation Framework:
 *   - $match (opcional según filtros)
 *   - $group ($sum, $cond, $eq)
 *   - $sort
 *   - $limit (5)
 *   - $lookup (unión de `found_items.zoneId` con `campus_zones._id`)
 *   - $unwind
 *   - $project ($toString)
 *
 * Índices aprovechados:
 *   - { zoneId: 1, foundAt: -1 } en `found_items` y `{ _id: 1 }` en `campus_zones`
 */
export function buildTopZonesPipeline(filters: ReportFilters): Document[] {
  const matchStage = buildBaseMatch(filters);
  const pipeline: Document[] = [];

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push(
    {
      $group: {
        _id: "$zoneId",
        totalFound: { $sum: 1 },
        totalReturned: {
          $sum: {
            $cond: [{ $eq: ["$status", "devuelto"] }, 1, 0],
          },
        },
      },
    },
    {
      $sort: { totalFound: -1, totalReturned: -1, _id: 1 },
    },
    {
      $limit: TOP_ZONES_LIMIT,
    },
    {
      $lookup: {
        from: COLLECTIONS.campusZones,
        localField: "_id",
        foreignField: "_id",
        as: "zone",
      },
    },
    {
      $unwind: {
        path: "$zone",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $project: {
        _id: 0,
        zoneId: { $toString: "$_id" },
        zoneCode: "$zone.code",
        zoneName: "$zone.name",
        totalFound: 1,
        totalReturned: 1,
      },
    },
    {
      $sort: { totalFound: -1, zoneName: 1 },
    },
  );

  return pipeline;
}

/**
 * REPORTE 3 — Tiempo promedio de devolución por categoría (`GET /api/reports/avg-return-time`)
 *
 * Pregunta de negocio:
 *   ¿Cuántas horas y días promedio tarda en devolverse un objeto según su categoría?
 *
 * Operadores de Aggregation Framework:
 *   - $match (solo `status: "devuelto"` con `delivery.returnedAt` y `foundAt` de tipo `date`)
 *   - $project ($max, $divide, $subtract para calcular duración en horas)
 *   - $group ($sum, $avg)
 *   - $match (`returnedCount > 0` para evitar grupos vacíos)
 *   - $project ($round, $divide, $ifNull)
 *   - $sort
 *
 * Índices aprovechados:
 *   - { category: 1, status: 1 }
 */
export function buildAvgReturnTimePipeline(filters: ReportFilters): Document[] {
  const foundAtRange = buildDateRangeFilter(filters);

  const matchStage: Document = {
    status: "devuelto",
    "delivery.returnedAt": { $type: "date" },
    foundAt: foundAtRange
      ? { ...foundAtRange, $type: "date" }
      : { $type: "date" },
  };

  return [
    { $match: matchStage },
    {
      $project: {
        category: 1,
        returnHours: {
          $max: [
            0,
            {
              $divide: [
                { $subtract: ["$delivery.returnedAt", "$foundAt"] },
                MILLISECONDS_PER_HOUR,
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$category",
        returnedCount: { $sum: 1 },
        avgReturnHoursRaw: { $avg: "$returnHours" },
      },
    },
    {
      $match: {
        returnedCount: { $gt: 0 },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        returnedCount: 1,
        avgReturnHours: {
          $round: [{ $ifNull: ["$avgReturnHoursRaw", 0] }, 2],
        },
        avgReturnDays: {
          $round: [
            { $divide: [{ $ifNull: ["$avgReturnHoursRaw", 0] }, 24] },
            2,
          ],
        },
      },
    },
    {
      $sort: { avgReturnHours: 1, category: 1 },
    },
  ];
}

/**
 * REPORTE 4 — Evolución mensual (`GET /api/reports/monthly-trend`)
 *
 * Pregunta de negocio:
 *   ¿Cómo evolucionan mes a mes los objetos encontrados frente a los devueltos?
 *
 * Operadores de Aggregation Framework:
 *   - $match (opcional según filtros)
 *   - $group ($dateToString con formato "%Y-%m", $sum, $cond, $eq)
 *   - $project
 *   - $sort (orden cronológico ascendente)
 *
 * Índices aprovechados:
 *   - { zoneId: 1, foundAt: -1 } / { status: 1, createdAt: -1 }
 */
export function buildMonthlyTrendPipeline(filters: ReportFilters): Document[] {
  const matchStage = buildBaseMatch(filters);
  const pipeline: Document[] = [];

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push(
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m",
            date: "$foundAt",
          },
        },
        totalFound: { $sum: 1 },
        totalReturned: {
          $sum: {
            $cond: [{ $eq: ["$status", "devuelto"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        month: "$_id",
        totalFound: 1,
        totalReturned: 1,
      },
    },
    {
      $sort: { month: 1 },
    },
  );

  return pipeline;
}
