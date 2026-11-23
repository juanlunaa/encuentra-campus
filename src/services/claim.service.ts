import { ObjectId } from "mongodb";
import { MAX_CLAIM_EVIDENCE_IMAGES } from "@/lib/catalogs";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  deleteImagesByKeys,
  uploadImagesWithRollback,
  validateImageBatch,
  type ImageUploadInput,
} from "@/lib/storage";
import { claimRepository, toClaimDTO } from "@/repositories/claim.repository";
import { foundItemRepository } from "@/repositories/found-item.repository";
import { foundItemService } from "@/services/found-item.service";
import type { ClaimDTO } from "@/types/claim";
import type { FoundItemDetailDTO, StoredImage } from "@/types/found-item";
import {
  createClaimSchema,
  evaluateClaimSchema,
  updateItemStatusSchema,
} from "@/validators/claim.validator";

const AUTO_REJECT_REASON = "Se aprobó otro reclamo para esta publicación.";
const DEFAULT_CANCEL_REASON = "La entrega no se concretó.";

function getMongoErrorCode(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "number") {
      return code;
    }
  }
  return undefined;
}

export interface EvaluateClaimResult {
  claim: ClaimDTO;
  item: FoundItemDetailDTO;
  autoRejectedCount: number;
}

export async function createClaim(
  postId: string,
  claimantId: string,
  rawInput: unknown,
  evidenceFiles: Array<File | ImageUploadInput> = [],
): Promise<ClaimDTO> {
  if (!ObjectId.isValid(postId)) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  if (!ObjectId.isValid(claimantId)) {
    throw new ValidationError("El identificador del solicitante no es válido.");
  }

  const parsed = createClaimSchema.parse(rawInput);

  const item = await foundItemRepository.findById(postId);
  if (!item) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  if (item.publisherId.toHexString() === claimantId) {
    throw new ForbiddenError(
      "No puedes enviar un reclamo sobre tu propia publicación.",
    );
  }

  if (item.status !== "disponible") {
    if (item.status === "en_custodia_campus") {
      throw new ConflictError(
        "Esta publicación fue entregada en un punto seguro del campus y no acepta reclamos por la plataforma.",
      );
    }
    if (item.status === "en_reclamo") {
      throw new ConflictError(
        "Esta publicación ya tiene un reclamo aprobado en curso y no acepta nuevos reclamos.",
      );
    }
    throw new ConflictError(
      "Esta publicación ya fue marcada como devuelta y no acepta nuevos reclamos.",
    );
  }

  const claimantObjectId = new ObjectId(claimantId);
  const existingPending = await claimRepository.findPendingByPostAndClaimant(
    item._id,
    claimantObjectId,
  );
  if (existingPending) {
    throw new ConflictError(
      "Ya tienes una solicitud de reclamo pendiente para esta publicación.",
    );
  }

  validateImageBatch(evidenceFiles, MAX_CLAIM_EVIDENCE_IMAGES);

  const claimId = new ObjectId();
  let evidenceImage: StoredImage | null = null;

  if (evidenceFiles.length > 0) {
    const uploaded = await uploadImagesWithRollback(
      evidenceFiles,
      "claims",
      MAX_CLAIM_EVIDENCE_IMAGES,
      claimId.toHexString(),
    );
    evidenceImage = uploaded[0] ?? null;
  }

  const now = new Date();

  try {
    const created = await claimRepository.create(
      {
        postId: item._id,
        claimantId: claimantObjectId,
        verificationAnswer: parsed.verificationAnswer,
        evidenceImage,
        status: "pending",
        resolutionReason: null,
        createdAt: now,
        resolvedAt: null,
      },
      claimId,
    );

    const detail = await claimRepository.findDetailById(created._id);
    return detail ?? toClaimDTO(created);
  } catch (error) {
    if (evidenceImage) {
      await deleteImagesByKeys([evidenceImage.key]);
    }
    if (getMongoErrorCode(error) === 11000) {
      throw new ConflictError(
        "Ya tienes una solicitud de reclamo pendiente para esta publicación.",
      );
    }
    throw error;
  }
}

export async function listClaimsForItem(
  postId: string,
  currentUserId: string,
): Promise<ClaimDTO[]> {
  if (!ObjectId.isValid(postId)) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  const item = await foundItemRepository.findById(postId);
  if (!item) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  if (item.publisherId.toHexString() !== currentUserId) {
    throw new ForbiddenError(
      "Solo el publicante puede consultar los reclamos de esta publicación.",
    );
  }

  return claimRepository.listByPostId(item._id);
}

export async function listMyClaimsForItem(
  postId: string,
  currentUserId: string,
): Promise<ClaimDTO[]> {
  if (!ObjectId.isValid(postId) || !ObjectId.isValid(currentUserId)) {
    return [];
  }

  return claimRepository.findByPostAndClaimant(
    new ObjectId(postId),
    new ObjectId(currentUserId),
  );
}

export async function evaluateClaim(
  claimId: string,
  currentUserId: string,
  rawInput: unknown,
): Promise<EvaluateClaimResult> {
  if (!ObjectId.isValid(claimId)) {
    throw new NotFoundError("El reclamo solicitado no fue encontrado.");
  }

  const parsed = evaluateClaimSchema.parse(rawInput);

  const claim = await claimRepository.findById(claimId);
  if (!claim) {
    throw new NotFoundError("El reclamo solicitado no fue encontrado.");
  }

  const item = await foundItemRepository.findById(claim.postId);
  if (!item) {
    throw new NotFoundError("La publicación asociada al reclamo no fue encontrada.");
  }

  if (item.publisherId.toHexString() !== currentUserId) {
    throw new ForbiddenError(
      "Solo el publicante puede evaluar los reclamos de esta publicación.",
    );
  }

  if (claim.status !== "pending") {
    throw new ConflictError(
      "Solo se pueden evaluar reclamos que se encuentren en estado pendiente.",
    );
  }

  const now = new Date();

  if (parsed.action === "approve") {
    if (item.status !== "disponible") {
      throw new ConflictError(
        "Solo se pueden aprobar reclamos cuando la publicación está disponible.",
      );
    }

    // Decisión D8: transición atómica con filtro condicional status: "disponible"
    const transitionedItem = await foundItemRepository.transitionToInClaim(
      item._id,
      claim._id,
      now,
    );
    if (!transitionedItem) {
      throw new ConflictError(
        "La publicación ya no está disponible o ya tiene otro reclamo aprobado.",
      );
    }

    const approvedClaim = await claimRepository.markApproved(
      claim._id,
      now,
      parsed.resolutionReason,
    );
    if (!approvedClaim) {
      await foundItemRepository.revertToAvailable(item._id, new Date());
      throw new ConflictError(
        "El reclamo ya fue procesado anteriormente.",
      );
    }

    const autoRejectedCount = await claimRepository.rejectOtherPending(
      item._id,
      claim._id,
      now,
      AUTO_REJECT_REASON,
    );

    const [claimDetail, itemDetail] = await Promise.all([
      claimRepository.findDetailById(approvedClaim._id),
      foundItemService.getDetail(item._id.toHexString(), currentUserId),
    ]);

    return {
      claim: claimDetail ?? toClaimDTO(approvedClaim),
      item: itemDetail,
      autoRejectedCount,
    };
  }

  const rejectedClaim = await claimRepository.markRejected(
    claim._id,
    now,
    parsed.resolutionReason,
  );
  if (!rejectedClaim) {
    throw new ConflictError("El reclamo ya fue procesado anteriormente.");
  }

  const [claimDetail, itemDetail] = await Promise.all([
    claimRepository.findDetailById(rejectedClaim._id),
    foundItemService.getDetail(item._id.toHexString(), currentUserId),
  ]);

  return {
    claim: claimDetail ?? toClaimDTO(rejectedClaim),
    item: itemDetail,
    autoRejectedCount: 0,
  };
}

export async function updateItemDeliveryStatus(
  postId: string,
  currentUserId: string,
  rawInput: unknown,
): Promise<FoundItemDetailDTO> {
  if (!ObjectId.isValid(postId)) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  const parsed = updateItemStatusSchema.parse(rawInput);

  const item = await foundItemRepository.findById(postId);
  if (!item) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  if (item.publisherId.toHexString() !== currentUserId) {
    throw new ForbiddenError(
      "Solo el publicante puede actualizar el estado de entrega de esta publicación.",
    );
  }

  if (item.status === "en_custodia_campus") {
    throw new ConflictError(
      "Las publicaciones en custodia del campus tienen cierre permanente y no pueden cambiar de estado.",
    );
  }

  if (item.status === "devuelto") {
    throw new ConflictError(
      "Esta publicación ya fue marcada como devuelta y su estado no puede modificarse.",
    );
  }

  if (item.status !== "en_reclamo") {
    throw new ConflictError(
      "Solo puedes confirmar la entrega o revertir a disponible cuando la publicación está en reclamo.",
    );
  }

  const now = new Date();

  if (parsed.status === "devuelto") {
    const updated = await foundItemRepository.transitionToReturned(
      item._id,
      now,
    );
    if (!updated) {
      throw new ConflictError(
        "No se pudo confirmar la entrega porque el estado de la publicación cambió.",
      );
    }

    return foundItemService.getDetail(item._id.toHexString(), currentUserId);
  }

  const approvedClaimId = item.delivery.approvedClaimId;
  const reverted = await foundItemRepository.revertToAvailable(item._id, now);
  if (!reverted) {
    throw new ConflictError(
      "No se pudo revertir la publicación a disponible porque su estado cambió.",
    );
  }

  const cancelReason = parsed.reason ?? DEFAULT_CANCEL_REASON;
  if (approvedClaimId) {
    await claimRepository.markCancelled(approvedClaimId, now, cancelReason);
  } else {
    await claimRepository.cancelApprovedByPostId(item._id, now, cancelReason);
  }

  return foundItemService.getDetail(item._id.toHexString(), currentUserId);
}

export const claimService = {
  create: createClaim,
  listForItem: listClaimsForItem,
  listMyClaimsForItem,
  evaluate: evaluateClaim,
  updateItemDeliveryStatus,
};
