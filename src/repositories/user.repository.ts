import { ObjectId } from "mongodb";
import { COLLECTIONS, getCollection } from "@/lib/mongodb";
import type {
  NewUserDocument,
  PublicUserDTO,
  SessionUserDTO,
  UserDocument,
} from "@/types/user";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toSessionUserDTO(user: UserDocument): SessionUserDTO {
  return {
    id: user._id.toHexString(),
    fullName: user.fullName,
    email: user.email,
    program: user.program,
    contactPhone: user.contactPhone,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toPublicUserDTO(user: UserDocument): PublicUserDTO {
  return {
    id: user._id.toHexString(),
    fullName: user.fullName,
    program: user.program,
  };
}

export async function findUserByEmail(
  email: string,
): Promise<UserDocument | null> {
  const collection = await getCollection<UserDocument>(COLLECTIONS.users);
  return collection.findOne({ email: normalizeEmail(email) });
}

export async function findUserById(
  id: string | ObjectId,
): Promise<UserDocument | null> {
  let objectId: ObjectId;
  if (typeof id === "string") {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    objectId = new ObjectId(id);
  } else {
    objectId = id;
  }

  const collection = await getCollection<UserDocument>(COLLECTIONS.users);
  return collection.findOne({ _id: objectId });
}

export async function createUser(
  data: NewUserDocument,
): Promise<UserDocument> {
  const collection = await getCollection<UserDocument>(COLLECTIONS.users);
  const documentToInsert: NewUserDocument = {
    ...data,
    email: normalizeEmail(data.email),
  };

  const result = await collection.insertOne(documentToInsert as UserDocument);
  return {
    _id: result.insertedId,
    ...documentToInsert,
  };
}

export async function deleteUserById(id: string | ObjectId): Promise<boolean> {
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  const collection = await getCollection<UserDocument>(COLLECTIONS.users);
  const result = await collection.deleteOne({ _id: objectId });
  return result.deletedCount > 0;
}

export const userRepository = {
  findByEmail: findUserByEmail,
  findById: findUserById,
  create: createUser,
  deleteById: deleteUserById,
};
