import { ObjectId, type Document } from "mongodb";
import { COLLECTIONS, getCollection } from "@/lib/mongodb";
import type {
  ClaimDTO,
  ClaimDocument,
  NewClaimDocument,
} from "@/types/claim";

function toObjectId(id: string | ObjectId): ObjectId | null {
  if (typeof id === "string") {
    if (!ObjectId.isValid(id)) return null;
    return new ObjectId(id);
  }
  return id;
}

interface AggregatedClaimRow extends ClaimDocument {
  claimantName?: string;
  claimantProgram?: string;
}

export function toClaimDTO(row: AggregatedClaimRow): ClaimDTO {
  return {
    id: row._id.toHexString(),
    postId: row.postId.toHexString(),
    claimantId: row.claimantId.toHexString(),
    ...(row.claimantName ? { claimantName: row.claimantName } : {}),
    ...(row.claimantProgram ? { claimantProgram: row.claimantProgram } : {}),
    verificationAnswer: row.verificationAnswer,
    evidenceImage: row.evidenceImage ?? null,
    status: row.status,
    resolutionReason: row.resolutionReason ?? null,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  };
}

export async function findClaimById(
  id: string | ObjectId,
): Promise<ClaimDocument | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);
  return collection.findOne({ _id: objectId });
}

export async function findClaimDetailById(
  id: string | ObjectId,
): Promise<ClaimDTO | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);
  const pipeline: Document[] = [
    { $match: { _id: objectId } },
    {
      $lookup: {
        from: COLLECTIONS.users,
        localField: "claimantId",
        foreignField: "_id",
        pipeline: [{ $project: { fullName: 1, program: 1 } }],
        as: "_claimant",
      },
    },
    {
      $addFields: {
        claimantName: {
          $ifNull: [{ $arrayElemAt: ["$_claimant.fullName", 0] }, "Estudiante"],
        },
        claimantProgram: {
          $ifNull: [{ $arrayElemAt: ["$_claimant.program", 0] }, undefined],
        },
      },
    },
    { $project: { _claimant: 0 } },
  ];

  const rows = await collection
    .aggregate<AggregatedClaimRow>(pipeline)
    .toArray();
  return rows[0] ? toClaimDTO(rows[0]) : null;
}

export async function findPendingClaimByPostAndClaimant(
  postId: ObjectId,
  claimantId: ObjectId,
): Promise<ClaimDocument | null> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);
  return collection.findOne({ postId, claimantId, status: "pending" });
}

export async function findClaimsByPostAndClaimant(
  postId: ObjectId,
  claimantId: ObjectId,
): Promise<ClaimDTO[]> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);
  const docs = await collection
    .find({ postId, claimantId })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((doc) => toClaimDTO(doc));
}

export async function listClaimsByPostId(
  postId: ObjectId,
): Promise<ClaimDTO[]> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);

  const pipeline: Document[] = [
    { $match: { postId } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: COLLECTIONS.users,
        localField: "claimantId",
        foreignField: "_id",
        pipeline: [{ $project: { fullName: 1, program: 1 } }],
        as: "_claimant",
      },
    },
    {
      $addFields: {
        claimantName: {
          $ifNull: [{ $arrayElemAt: ["$_claimant.fullName", 0] }, "Estudiante"],
        },
        claimantProgram: {
          $ifNull: [{ $arrayElemAt: ["$_claimant.program", 0] }, undefined],
        },
      },
    },
    { $project: { _claimant: 0 } },
  ];

  const rows = await collection
    .aggregate<AggregatedClaimRow>(pipeline)
    .toArray();
  return rows.map(toClaimDTO);
}

export async function createClaimDocument(
  data: NewClaimDocument,
  forcedId?: ObjectId,
): Promise<ClaimDocument> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);

  const docToInsert: ClaimDocument = {
    _id: forcedId ?? new ObjectId(),
    ...data,
  };

  await collection.insertOne(docToInsert);
  return docToInsert;
}

export async function markClaimApproved(
  claimId: ObjectId,
  resolvedAt: Date,
  resolutionReason: string | null = null,
): Promise<ClaimDocument | null> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);

  return collection.findOneAndUpdate(
    { _id: claimId, status: "pending" },
    {
      $set: {
        status: "approved",
        resolutionReason,
        resolvedAt,
      },
    },
    { returnDocument: "after" },
  );
}

export async function rejectOtherPendingClaims(
  postId: ObjectId,
  excludedClaimId: ObjectId,
  resolvedAt: Date,
  reason: string,
): Promise<number> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);

  const result = await collection.updateMany(
    {
      postId,
      _id: { $ne: excludedClaimId },
      status: "pending",
    },
    {
      $set: {
        status: "rejected",
        resolutionReason: reason,
        resolvedAt,
      },
    },
  );

  return result.modifiedCount;
}

export async function markClaimRejected(
  claimId: ObjectId,
  resolvedAt: Date,
  resolutionReason: string | null,
): Promise<ClaimDocument | null> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);

  return collection.findOneAndUpdate(
    { _id: claimId, status: "pending" },
    {
      $set: {
        status: "rejected",
        resolutionReason,
        resolvedAt,
      },
    },
    { returnDocument: "after" },
  );
}

export async function markClaimCancelled(
  claimId: ObjectId,
  resolvedAt: Date,
  resolutionReason: string | null,
): Promise<ClaimDocument | null> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);

  return collection.findOneAndUpdate(
    { _id: claimId, status: "approved" },
    {
      $set: {
        status: "cancelled",
        resolutionReason,
        resolvedAt,
      },
    },
    { returnDocument: "after" },
  );
}

export async function cancelApprovedClaimsByPostId(
  postId: ObjectId,
  resolvedAt: Date,
  resolutionReason: string | null,
): Promise<number> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);

  const result = await collection.updateMany(
    { postId, status: "approved" },
    {
      $set: {
        status: "cancelled",
        resolutionReason,
        resolvedAt,
      },
    },
  );

  return result.modifiedCount;
}

export async function countActiveClaimsByPostId(
  postId: ObjectId,
): Promise<number> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);
  return collection.countDocuments({
    postId,
    status: { $in: ["pending", "approved"] },
  });
}

export async function hasApprovedClaimForUser(
  postId: ObjectId,
  claimantId: ObjectId,
): Promise<boolean> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);
  const found = await collection.findOne(
    { postId, claimantId, status: "approved" },
    { projection: { _id: 1 } },
  );
  return Boolean(found);
}

export async function deleteClaimsByPostId(
  postId: ObjectId,
): Promise<string[]> {
  const collection = await getCollection<ClaimDocument>(COLLECTIONS.claims);
  const existing = await collection
    .find({ postId }, { projection: { "evidenceImage.key": 1 } })
    .toArray();

  const evidenceKeys = existing
    .map((c) => c.evidenceImage?.key)
    .filter((key): key is string => Boolean(key));

  await collection.deleteMany({ postId });
  return evidenceKeys;
}

export const claimRepository = {
  findById: findClaimById,
  findDetailById: findClaimDetailById,
  findPendingByPostAndClaimant: findPendingClaimByPostAndClaimant,
  findByPostAndClaimant: findClaimsByPostAndClaimant,
  listByPostId: listClaimsByPostId,
  create: createClaimDocument,
  markApproved: markClaimApproved,
  rejectOtherPending: rejectOtherPendingClaims,
  markRejected: markClaimRejected,
  markCancelled: markClaimCancelled,
  cancelApprovedByPostId: cancelApprovedClaimsByPostId,
  countActiveByPostId: countActiveClaimsByPostId,
  hasApprovedClaimForUser,
  deleteByPostId: deleteClaimsByPostId,
};
