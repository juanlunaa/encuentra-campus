import { NextResponse } from "next/server";
import { UnauthorizedError, toErrorResponse } from "@/lib/errors";
import { authService } from "@/services/auth.service";
import { foundItemService } from "@/services/found-item.service";

interface RouteContext {
  params: Promise<{ id: string; commentId: string }>;
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await authService.getCurrentSessionUser();
    if (!user) {
      throw new UnauthorizedError(
        "Debes iniciar sesión para eliminar un comentario.",
      );
    }

    const { id, commentId } = await context.params;
    await foundItemService.deleteComment(id, commentId, user.id);

    return NextResponse.json(
      { message: "Comentario eliminado correctamente." },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
