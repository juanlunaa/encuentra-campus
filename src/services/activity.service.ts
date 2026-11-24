import { ObjectId } from "mongodb";
import { UnauthorizedError } from "@/lib/errors";
import { claimRepository } from "@/repositories/claim.repository";
import { foundItemRepository } from "@/repositories/found-item.repository";
import type {
  ActivityCountsDTO,
  PaginatedActivityClaimsResponse,
  PaginatedActivityItemsResponse,
} from "@/types/activity";
import {
  activityClaimsQuerySchema,
  activityItemsQuerySchema,
} from "@/validators/activity.validator";

function requireUserObjectId(userId: string): ObjectId {
  if (!ObjectId.isValid(userId)) {
    throw new UnauthorizedError(
      "Tu sesión no es válida. Inicia sesión nuevamente.",
    );
  }
  return new ObjectId(userId);
}

export async function getActivityCounts(
  userId: string,
): Promise<ActivityCountsDTO> {
  const userObjectId = requireUserObjectId(userId);
  const [totalItems, totalClaims] = await Promise.all([
    foundItemRepository.countByPublisher(userObjectId),
    claimRepository.countByClaimant(userObjectId),
  ]);

  return { totalItems, totalClaims };
}

export async function listMyItems(
  userId: string,
  rawQuery: Record<string, unknown> = {},
): Promise<PaginatedActivityItemsResponse> {
  const userObjectId = requireUserObjectId(userId);
  const filters = activityItemsQuerySchema.parse(rawQuery);

  const [listResult, counts] = await Promise.all([
    foundItemRepository.listByPublisher(userObjectId, filters),
    getActivityCounts(userId),
  ]);

  const { items, total, page, limit } = listResult;

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    counts,
  };
}

export async function listMyClaims(
  userId: string,
  rawQuery: Record<string, unknown> = {},
): Promise<PaginatedActivityClaimsResponse> {
  const userObjectId = requireUserObjectId(userId);
  const filters = activityClaimsQuerySchema.parse(rawQuery);

  const [listResult, counts] = await Promise.all([
    claimRepository.listByClaimant(userObjectId, filters),
    getActivityCounts(userId),
  ]);

  const { claims, total, page, limit } = listResult;

  return {
    claims,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    counts,
  };
}

export const activityService = {
  getActivityCounts,
  listMyItems,
  listMyClaims,
};
