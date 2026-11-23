import { NextResponse } from "next/server";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { toErrorResponse, ValidationError } from "@/lib/errors";
import { authService } from "@/services/auth.service";

export async function POST(request: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError(
        "El cuerpo de la solicitud debe ser un JSON válido.",
      );
    }

    const { user, token } = await authService.loginUser(body);

    const response = NextResponse.json(
      {
        message: "Inicio de sesión exitoso.",
        user,
      },
      { status: 200 },
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
