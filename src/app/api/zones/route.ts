import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { toCampusZoneDTO, zoneRepository } from "@/repositories/zone.repository";

export async function GET(): Promise<Response> {
  try {
    const zones = await zoneRepository.findActive();

    return NextResponse.json(
      {
        zones: zones.map(toCampusZoneDTO),
      },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
