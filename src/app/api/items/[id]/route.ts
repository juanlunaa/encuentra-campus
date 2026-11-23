import { NextResponse } from "next/server";
import {
  UnauthorizedError,
  ValidationError,
  toErrorResponse,
} from "@/lib/errors";
import { authService } from "@/services/auth.service";
import { foundItemService } from "@/services/found-item.service";
import { extractItemMultipartPayload } from "@/validators/found-item.validator";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function parsePatchRequest(request: Request): Promise<{
  payload: unknown;
  files: File[];
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      return extractItemMultipartPayload(formData);
    } catch {
      throw new ValidationError(
        "Los datos del formulario multimedia no tienen un formato válido.",
      );
    }
  }

  try {
    const payload = await request.json();
    return { payload, files: [] };
  } catch {
    throw new ValidationError("El cuerpo de la solicitud no es un JSON válido.");
  }
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;
    const user = await authService.getCurrentSessionUser();
    const item = await foundItemService.getDetail(id, user?.id ?? null);

    return NextResponse.json(
      { item },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await authService.getCurrentSessionUser();
    if (!user) {
      throw new UnauthorizedError(
        "Debes iniciar sesión para editar una publicación.",
      );
    }

    const { id } = await context.params;
    const { payload, files } = await parsePatchRequest(request);
    const item = await foundItemService.update(id, user.id, payload, files);

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await authService.getCurrentSessionUser();
    if (!user) {
      throw new UnauthorizedError(
        "Debes iniciar sesión para eliminar una publicación.",
      );
    }

    const { id } = await context.params;
    await foundItemService.delete(id, user.id);

    return NextResponse.json(
      { message: "Publicación eliminada correctamente." },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
