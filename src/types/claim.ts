import type { ObjectId } from "mongodb";
import type { ClaimStatus } from "@/lib/catalogs";
import type { StoredImage } from "@/types/found-item";

export interface ClaimDocument {
  _id: ObjectId;
  postId: ObjectId;
  claimantId: ObjectId;
  verificationAnswer: string;
  evidenceImage: StoredImage | null;
  status: ClaimStatus;
  resolutionReason: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

export type NewClaimDocument = Omit<ClaimDocument, "_id">;

export interface ClaimDTO {
  id: string;
  postId: string;
  claimantId: string;
  claimantName?: string;
  claimantProgram?: string;
  verificationAnswer: string;
  evidenceImage: StoredImage | null;
  status: ClaimStatus;
  resolutionReason: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
