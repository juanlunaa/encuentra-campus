import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { authService } from "@/services/auth.service";

export async function GET(): Promise<Response> {
  try {
    const user = await authService.getCurrentSessionUser();

    return NextResponse.json(
      {
        authenticated: Boolean(user),
        user,
      },
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
