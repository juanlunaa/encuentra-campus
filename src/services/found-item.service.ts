import { ObjectId } from "mongodb";
import {
  MAX_ITEM_IMAGES,
  OTHER_CATEGORY,
  type ItemStatus,
} from "@/lib/catalogs";
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
import {
  foundItemRepository,
  mapDetailRecordToDTO,
  toItemCommentDTO,
} from "@/repositories/found-item.repository";
import { zoneRepository } from "@/repositories/zone.repository";
import type {
  FoundItemDetailDTO,
  ItemCommentDTO,
  ItemCommentDocument,
  PaginatedItemsResponse,
  StoredImage,
} from "@/types/found-item";
import {
  createCommentSchema,
  createFoundItemSchema,
  listFoundItemsQuerySchema,
  updateFoundItemSchema,
} from "@/validators/found-item.validator";

export async function createFoundItem(
  publisherId: string,
  rawInput: unknown,
  imageFiles: Array<File | ImageUploadInput> = [],
): Promise<FoundItemDetailDTO> {
  if (!ObjectId.isValid(publisherId)) {
    throw new ValidationError("El identificador del publicante no es válido.");
  }

  const parsed = createFoundItemSchema.parse(rawInput);

  const zone = await zoneRepository.findById(parsed.zoneId);
  if (!zone || !zone.isActive) {
    throw new ValidationError(
      "La zona seleccionada no existe o no está disponible.",
    );
  }

  validateImageBatch(imageFiles, MAX_ITEM_IMAGES);

  const postId = new ObjectId();
  const uploadedImages = await uploadImagesWithRollback(
    imageFiles,
    "items",
    MAX_ITEM_IMAGES,
    postId.toHexString(),
  );

  const now = new Date();
  const status: ItemStatus =
    parsed.custody.mode === "campus_safe_point"
      ? "en_custodia_campus"
      : "disponible";

  try {
    await foundItemRepository.create(
      {
        publisherId: new ObjectId(publisherId),
        zoneId: zone._id,
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        customCategory: parsed.customCategory,
        status,
        location: parsed.location,
        custody: parsed.custody,
        delivery: {
          approvedClaimId: null,
          returnedAt: null,
        },
        tags: parsed.tags,
        images: uploadedImages,
        comments: [],
        foundAt: parsed.foundAt,
        createdAt: now,
        updatedAt: now,
      },
      postId,
    );
  } catch (error) {
    if (uploadedImages.length > 0) {
      await deleteImagesByKeys(uploadedImages.map((img) => img.key));
    }
    throw error;
  }

  return getFoundItemDetail(postId.toHexString(), publisherId);
}

export async function listFoundItems(
  rawQuery: Record<string, unknown>,
): Promise<PaginatedItemsResponse> {
  const filters = listFoundItemsQuerySchema.parse(rawQuery);
  const { items, total, page, limit } = await foundItemRepository.list(filters);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export async function getFoundItemDetail(
  itemId: string,
  viewerUserId: string | null = null,
): Promise<FoundItemDetailDTO> {
  if (!ObjectId.isValid(itemId)) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  const record = await foundItemRepository.findDetailById(itemId);
  if (!record) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  let revealContactPhone = false;

  if (
    viewerUserId &&
    ObjectId.isValid(viewerUserId) &&
    (record.status === "en_reclamo" || record.status === "devuelto")
  ) {
    revealContactPhone = await foundItemRepository.hasApprovedClaimForUser(
      record._id,
      new ObjectId(viewerUserId),
    );
  }

  return mapDetailRecordToDTO(record, revealContactPhone);
}

export async function updateFoundItem(
  itemId: string,
  currentUserId: string,
  rawInput: unknown,
  newImageFiles: Array<File | ImageUploadInput> = [],
): Promise<FoundItemDetailDTO> {
  if (!ObjectId.isValid(itemId)) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  const existing = await foundItemRepository.findById(itemId);
  if (!existing) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  if (existing.publisherId.toHexString() !== currentUserId) {
    throw new ForbiddenError(
      "Solo el publicante puede editar esta publicación.",
    );
  }

  if (existing.status === "en_reclamo" || existing.status === "devuelto") {
    throw new ConflictError(
      "No se puede editar una publicación mientras está en reclamo o después de haber sido devuelta.",
    );
  }

  const parsed = updateFoundItemSchema.parse(rawInput);

  const setFields: Record<string, unknown> = {};

  if (parsed.title !== undefined) {
    setFields.title = parsed.title;
  }

  if (parsed.description !== undefined) {
    setFields.description = parsed.description;
  }

  if (parsed.foundAt !== undefined) {
    setFields.foundAt = parsed.foundAt;
  }

  if (parsed.location !== undefined) {
    setFields.location = parsed.location;
  }

  if (parsed.zoneId !== undefined) {
    const zone = await zoneRepository.findById(parsed.zoneId);
    if (!zone || !zone.isActive) {
      throw new ValidationError(
        "La zona seleccionada no existe o no está disponible.",
      );
    }
    setFields.zoneId = zone._id;
  }

  const finalCategory = parsed.category ?? existing.category;
  if (parsed.category !== undefined || parsed.customCategory !== undefined) {
    if (finalCategory === OTHER_CATEGORY) {
      const candidateCustom =
        parsed.customCategory !== undefined
          ? (parsed.customCategory?.trim() ?? "")
          : (existing.customCategory?.trim() ?? "");

      if (candidateCustom.length < 2) {
        throw new ValidationError(
          'Debes especificar la categoría cuando seleccionas la opción "Otra".',
        );
      }

      setFields.category = finalCategory;
      setFields.customCategory = candidateCustom;
    } else {
      setFields.category = finalCategory;
      setFields.customCategory = null;
    }
  }

  if (parsed.custody !== undefined) {
    if (
      existing.status === "en_custodia_campus" &&
      parsed.custody.mode === "personal"
    ) {
      throw new ConflictError(
        "Una publicación entregada en punto seguro del campus no puede volver a custodia personal.",
      );
    }

    if (parsed.custody.mode === "campus_safe_point") {
      const safePoint = parsed.custody.safePointName?.trim() ?? "";
      if (safePoint.length < 2) {
        throw new ValidationError(
          "Debes indicar el punto seguro del campus donde entregaste el objeto.",
        );
      }
      setFields.custody = {
        mode: "campus_safe_point",
        verificationQuestion: null,
        safePointName: safePoint,
      };
      setFields.status = "en_custodia_campus";
    } else {
      setFields.custody = {
        mode: "personal",
        verificationQuestion:
          parsed.custody.verificationQuestion?.trim() || null,
        safePointName: null,
      };
    }
  }

  if (parsed.tags !== undefined) {
    setFields.tags = parsed.tags;
  }

  const existingImageKeys = new Set(existing.images.map((img) => img.key));
  const keysToRemove = Array.from(
    new Set(
      (parsed.removeImageKeys ?? []).filter((key) =>
        existingImageKeys.has(key),
      ),
    ),
  );

  const remainingImagesCount = existing.images.length - keysToRemove.length;
  if (remainingImagesCount + newImageFiles.length > MAX_ITEM_IMAGES) {
    throw new ValidationError(
      `Una publicación puede tener máximo ${MAX_ITEM_IMAGES} imágenes en total.`,
    );
  }

  validateImageBatch(newImageFiles, MAX_ITEM_IMAGES);

  let uploadedImages: StoredImage[] = [];
  if (newImageFiles.length > 0) {
    uploadedImages = await uploadImagesWithRollback(
      newImageFiles,
      "items",
      MAX_ITEM_IMAGES,
      existing._id.toHexString(),
    );
  }

  try {
    if (keysToRemove.length > 0) {
      await foundItemRepository.pullImages(existing._id, keysToRemove);
    }

    if (parsed.tags === undefined && parsed.removeTags?.length) {
      await foundItemRepository.pullTags(existing._id, parsed.removeTags);
    }

    if (Object.keys(setFields).length > 0) {
      await foundItemRepository.updateFields(existing._id, setFields);
    }

    if (uploadedImages.length > 0) {
      await foundItemRepository.pushImages(existing._id, uploadedImages);
    }

    if (parsed.tags === undefined && parsed.addTags?.length) {
      await foundItemRepository.pushTags(existing._id, parsed.addTags);
    }
  } catch (error) {
    if (uploadedImages.length > 0) {
      await deleteImagesByKeys(uploadedImages.map((img) => img.key));
    }
    throw error;
  }

  if (keysToRemove.length > 0) {
    await deleteImagesByKeys(keysToRemove);
  }

  return getFoundItemDetail(existing._id.toHexString(), currentUserId);
}

export async function deleteFoundItem(
  itemId: string,
  currentUserId: string,
): Promise<void> {
  if (!ObjectId.isValid(itemId)) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  const existing = await foundItemRepository.findById(itemId);
  if (!existing) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  if (existing.publisherId.toHexString() !== currentUserId) {
    throw new ForbiddenError(
      "Solo el publicante puede eliminar esta publicación.",
    );
  }

  const activeClaimsCount =
    await foundItemRepository.countActiveClaimsByPostId(existing._id);
  if (activeClaimsCount > 0) {
    throw new ConflictError(
      "No puedes eliminar esta publicación porque tiene reclamos pendientes o aprobados. Debes resolver los reclamos primero.",
    );
  }

  const claimEvidenceKeys = await foundItemRepository.deleteClaimsByPostId(
    existing._id,
  );
  await foundItemRepository.deleteById(existing._id);

  const allImageKeys = [
    ...existing.images.map((img) => img.key),
    ...claimEvidenceKeys,
  ];
  if (allImageKeys.length > 0) {
    await deleteImagesByKeys(allImageKeys);
  }
}

export async function addCommentToItem(
  itemId: string,
  author: { id: string; fullName: string },
  rawInput: unknown,
): Promise<ItemCommentDTO> {
  if (!ObjectId.isValid(itemId)) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  const parsed = createCommentSchema.parse(rawInput);

  const existing = await foundItemRepository.findById(itemId);
  if (!existing) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  if (existing.status === "devuelto") {
    throw new ConflictError(
      "No se pueden publicar nuevos comentarios en una publicación que ya fue devuelta.",
    );
  }

  const comment: ItemCommentDocument = {
    _id: new ObjectId(),
    authorId: new ObjectId(author.id),
    authorName: author.fullName,
    body: parsed.body,
    createdAt: new Date(),
  };

  await foundItemRepository.addComment(existing._id, comment);
  return toItemCommentDTO(comment);
}

export async function deleteCommentFromItem(
  itemId: string,
  commentId: string,
  currentUserId: string,
): Promise<void> {
  if (!ObjectId.isValid(itemId) || !ObjectId.isValid(commentId)) {
    throw new NotFoundError("El comentario solicitado no fue encontrado.");
  }

  const existing = await foundItemRepository.findById(itemId);
  if (!existing) {
    throw new NotFoundError("La publicación solicitada no fue encontrada.");
  }

  const targetComment = existing.comments.find(
    (comment) => comment._id.toHexString() === commentId,
  );
  if (!targetComment) {
    throw new NotFoundError("El comentario solicitado no fue encontrado.");
  }

  if (targetComment.authorId.toHexString() !== currentUserId) {
    throw new ForbiddenError(
      "Solo el autor del comentario puede eliminarlo.",
    );
  }

  await foundItemRepository.removeComment(
    existing._id,
    targetComment._id,
    new ObjectId(currentUserId),
  );
}

export const foundItemService = {
  create: createFoundItem,
  list: listFoundItems,
  getDetail: getFoundItemDetail,
  update: updateFoundItem,
  delete: deleteFoundItem,
  addComment: addCommentToItem,
  deleteComment: deleteCommentFromItem,
};
