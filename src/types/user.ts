import type { ObjectId } from "mongodb";

export interface UserDocument {
  _id: ObjectId;
  fullName: string;
  email: string;
  passwordHash: string;
  program: string;
  contactPhone: string;
  createdAt: Date;
}

export type NewUserDocument = Omit<UserDocument, "_id">;

export interface PublicUserDTO {
  id: string;
  fullName: string;
  program: string;
}

export interface SessionUserDTO {
  id: string;
  fullName: string;
  email: string;
  program: string;
  contactPhone: string;
  createdAt: string;
}

export interface SessionTokenPayload {
  sub: string;
  email: string;
  fullName: string;
}
