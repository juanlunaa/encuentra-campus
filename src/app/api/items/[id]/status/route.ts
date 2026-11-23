import { NextResponse } from "next/server";
import {
  UnauthorizedError,
  ValidationError,
  toErrorResponse,
} from "@/lib/errors";
import { authService } from "@/services/auth.service";
import { claimService } from "@/services/claim.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await authService.getCurrentSessionUser();
    if (!user) {
      throw new UnauthorizedError(
        "Debes iniciar sesión para actualizar el estado de la publicación.",
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new ValidationError(
        "El cuerpo de la solicitud no es un JSON válido.",
      );
    }

    const { id } = await context.params;
    const item = await claimService.updateItemDeliveryStatus(
      id,
      user.id,
      payload,
    );

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
