import { NextResponse } from "next/server";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";

export async function POST(): Promise<Response> {
  try {
    const response = NextResponse.json(
      {
        message: "Sesión cerrada correctamente.",
      },
      { status: 200 },
    );

    response.cookies.set(SESSION_COOKIE_NAME, "", getSessionCookieOptions(0));
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
