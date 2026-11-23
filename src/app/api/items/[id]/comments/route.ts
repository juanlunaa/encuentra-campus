import { NextResponse } from "next/server";
import {
  UnauthorizedError,
  ValidationError,
  toErrorResponse,
} from "@/lib/errors";
import { authService } from "@/services/auth.service";
import { foundItemService } from "@/services/found-item.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await authService.getCurrentSessionUser();
    if (!user) {
      throw new UnauthorizedError(
        "Debes iniciar sesión para publicar un comentario.",
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError(
        "El cuerpo de la solicitud no es un JSON válido.",
      );
    }

    const { id } = await context.params;
    const comment = await foundItemService.addComment(
      id,
      { id: user.id, fullName: user.fullName },
      body,
    );

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
