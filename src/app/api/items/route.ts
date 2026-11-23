import { NextResponse } from "next/server";
import {
  UnauthorizedError,
  ValidationError,
  toErrorResponse,
} from "@/lib/errors";
import { authService } from "@/services/auth.service";
import { foundItemService } from "@/services/found-item.service";
import { extractItemMultipartPayload } from "@/validators/found-item.validator";

async function parseCreateRequest(request: Request): Promise<{
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

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery: Record<string, string> = {};

    for (const key of [
      "query",
      "category",
      "zoneId",
      "status",
      "tag",
      "from",
      "to",
      "page",
      "limit",
    ]) {
      const value = searchParams.get(key);
      if (value !== null && value.trim() !== "") {
        rawQuery[key] = value;
      }
    }

    const result = await foundItemService.list(rawQuery);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authService.getCurrentSessionUser();
    if (!user) {
      throw new UnauthorizedError(
        "Debes iniciar sesión para publicar un objeto encontrado.",
      );
    }

    const { payload, files } = await parseCreateRequest(request);
    const item = await foundItemService.create(user.id, payload, files);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
