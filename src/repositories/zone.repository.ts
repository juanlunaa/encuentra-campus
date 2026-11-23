import { ObjectId } from "mongodb";
import { COLLECTIONS, getCollection } from "@/lib/mongodb";
import type { CampusZoneDTO, CampusZoneDocument } from "@/types/zone";

export function toCampusZoneDTO(zone: CampusZoneDocument): CampusZoneDTO {
  return {
    id: zone._id.toHexString(),
    campusName: zone.campusName,
    code: zone.code,
    name: zone.name,
    description: zone.description,
    floors: zone.floors,
    landmarks: zone.landmarks,
    isActive: zone.isActive,
  };
}

export async function findActiveZones(): Promise<CampusZoneDocument[]> {
  const collection = await getCollection<CampusZoneDocument>(
    COLLECTIONS.campusZones,
  );
  return collection.find({ isActive: true }).sort({ name: 1, code: 1 }).toArray();
}

export async function findZoneById(
  id: string | ObjectId,
): Promise<CampusZoneDocument | null> {
  let objectId: ObjectId;
  if (typeof id === "string") {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    objectId = new ObjectId(id);
  } else {
    objectId = id;
  }

  const collection = await getCollection<CampusZoneDocument>(
    COLLECTIONS.campusZones,
  );
  return collection.findOne({ _id: objectId });
}

export async function findZoneByCode(
  code: string,
): Promise<CampusZoneDocument | null> {
  const collection = await getCollection<CampusZoneDocument>(
    COLLECTIONS.campusZones,
  );
  return collection.findOne({ code: code.trim().toUpperCase() });
}

export const zoneRepository = {
  findActive: findActiveZones,
  findById: findZoneById,
  findByCode: findZoneByCode,
};
