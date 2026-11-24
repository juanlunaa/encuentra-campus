import { NextResponse } from "next/server";
import { UnauthorizedError, toErrorResponse } from "@/lib/errors";
import { activityService } from "@/services/activity.service";
import { authService } from "@/services/auth.service";

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await authService.getCurrentSessionUser();
    if (!user) {
      throw new UnauthorizedError(
        "Debes iniciar sesión para consultar tus reclamos.",
      );
    }

    const { searchParams } = new URL(request.url);
    const rawQuery: Record<string, string> = {};

    for (const key of ["query", "status", "page", "limit"]) {
      const value = searchParams.get(key);
      if (value !== null && value.trim() !== "") {
        rawQuery[key] = value;
      }
    }

    const result = await activityService.listMyClaims(user.id, rawQuery);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
