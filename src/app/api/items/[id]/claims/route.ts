import { NextResponse } from "next/server";
import {
  UnauthorizedError,
  ValidationError,
  toErrorResponse,
} from "@/lib/errors";
import { authService } from "@/services/auth.service";
import { claimService } from "@/services/claim.service";
import { extractClaimMultipartPayload } from "@/validators/claim.validator";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function parseCreateClaimRequest(request: Request): Promise<{
  payload: unknown;
  files: File[];
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      return extractClaimMultipartPayload(formData);
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
    const user = await authService.getCurrentSessionUser();
    if (!user) {
      throw new UnauthorizedError(
        "Debes iniciar sesión para consultar los reclamos de esta publicación.",
      );
    }

    const { id } = await context.params;
    const claims = await claimService.listForItem(id, user.id);

    return NextResponse.json(
      { claims },
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

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await authService.getCurrentSessionUser();
    if (!user) {
      throw new UnauthorizedError(
        "Debes iniciar sesión para enviar una solicitud de reclamo.",
      );
    }

    const { id } = await context.params;
    const { payload, files } = await parseCreateClaimRequest(request);
    const claim = await claimService.create(id, user.id, payload, files);

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
