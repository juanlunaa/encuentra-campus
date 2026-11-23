import type { ObjectId } from "mongodb";
import type {
  AllowedImageMimeType,
  CustodyMode,
  ItemCategory,
  ItemStatus,
} from "@/lib/catalogs";

export interface StoredImage {
  url: string;
  key: string;
  mimeType: AllowedImageMimeType;
  sizeBytes: number;
}

export interface ItemLocation {
  floor: string;
  roomOrDetail: string;
}

export interface ItemCustody {
  mode: CustodyMode;
  verificationQuestion: string | null;
  safePointName: string | null;
}

export interface ItemDelivery {
  approvedClaimId: ObjectId | null;
  returnedAt: Date | null;
}

export interface ItemCommentDocument {
  _id: ObjectId;
  authorId: ObjectId;
  authorName: string;
  body: string;
  createdAt: Date;
}

export interface FoundItemDocument {
  _id: ObjectId;
  publisherId: ObjectId;
  zoneId: ObjectId;
  title: string;
  description: string;
  category: ItemCategory;
  customCategory: string | null;
  status: ItemStatus;
  location: ItemLocation;
  custody: ItemCustody;
  delivery: ItemDelivery;
  tags: string[];
  images: StoredImage[];
  comments: ItemCommentDocument[];
  foundAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NewFoundItemDocument = Omit<FoundItemDocument, "_id">;

export interface ItemCommentDTO {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface ItemDeliveryDTO {
  approvedClaimId: string | null;
  returnedAt: string | null;
}

export interface FoundItemSummaryDTO {
  id: string;
  publisherId: string;
  publisherName: string;
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  title: string;
  description: string;
  category: ItemCategory;
  customCategory: string | null;
  status: ItemStatus;
  location: ItemLocation;
  custody: ItemCustody;
  tags: string[];
  images: StoredImage[];
  commentsCount: number;
  foundAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoundItemDetailDTO extends FoundItemSummaryDTO {
  delivery: ItemDeliveryDTO;
  comments: ItemCommentDTO[];
  /** Solo visible para el solicitante con reclamo aprobado (RNF-02). */
  publisherContactPhone: string | null;
}

export interface ItemListFilters {
  query?: string;
  category?: ItemCategory;
  zoneId?: string;
  status?: ItemStatus;
  tag?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedItemsResponse {
  items: FoundItemSummaryDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
