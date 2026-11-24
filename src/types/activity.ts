import type { ClaimStatus, ItemCategory, ItemStatus } from "@/lib/catalogs";
import type { ItemLocation, StoredImage } from "@/types/found-item";

export type ActivityTab = "items" | "claims";

export interface ActivityCountsDTO {
  totalItems: number;
  totalClaims: number;
}

export interface ActivityPaginationDTO {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ActivityItemSummaryDTO {
  id: string;
  title: string;
  category: ItemCategory;
  customCategory: string | null;
  status: ItemStatus;
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  location: ItemLocation;
  coverImage: StoredImage | null;
  imagesCount: number;
  pendingClaimsCount: number;
  foundAt: string;
  createdAt: string;
}

/**
 * Resumen público del objeto asociado a un reclamo en "Mis reclamos".
 * Por privacidad (RF-13.4, RNF-01), nunca incluye datos de contacto del publicante.
 */
export interface ActivityClaimItemSummaryDTO {
  id: string;
  title: string;
  category: ItemCategory;
  customCategory: string | null;
  status: ItemStatus;
  zoneCode: string;
  zoneName: string;
  coverImage: StoredImage | null;
}

export interface ActivityClaimSummaryDTO {
  id: string;
  postId: string;
  status: ClaimStatus;
  resolutionReason: string | null;
  createdAt: string;
  resolvedAt: string | null;
  item: ActivityClaimItemSummaryDTO;
}

export interface ActivityItemsFilters {
  query?: string;
  status?: ItemStatus;
  hasPendingClaims?: boolean;
  page?: number;
  limit?: number;
}

export interface ActivityClaimsFilters {
  query?: string;
  status?: ClaimStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedActivityItemsResponse {
  items: ActivityItemSummaryDTO[];
  pagination: ActivityPaginationDTO;
  counts: ActivityCountsDTO;
}

export interface PaginatedActivityClaimsResponse {
  claims: ActivityClaimSummaryDTO[];
  pagination: ActivityPaginationDTO;
  counts: ActivityCountsDTO;
}
