import type { ObjectId } from "mongodb";

export interface CampusZoneDocument {
  _id: ObjectId;
  campusName: string;
  code: string;
  name: string;
  description: string;
  floors: string[];
  landmarks: string[];
  isActive: boolean;
}

export type NewCampusZoneDocument = Omit<CampusZoneDocument, "_id">;

export interface CampusZoneDTO {
  id: string;
  campusName: string;
  code: string;
  name: string;
  description: string;
  floors: string[];
  landmarks: string[];
  isActive: boolean;
}
