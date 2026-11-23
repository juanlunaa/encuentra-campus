import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UnauthorizedError } from "@/lib/errors";
import type { SessionTokenPayload } from "@/types/user";

export const SESSION_COOKIE_NAME = "ec_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

const BCRYPT_SALT_ROUNDS = 10;
const JWT_ALGORITHM = "HS256";

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "Falta la variable de entorno JWT_SECRET o es demasiado corta (mínimo 16 caracteres). Configúrala en .env.local.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

export async function signSessionToken(
  payload: SessionTokenPayload,
): Promise<string> {
  return new SignJWT({
    email: payload.email,
    fullName: payload.fullName,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      algorithms: [JWT_ALGORITHM],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.fullName !== "string"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
    };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", getSessionCookieOptions(0));
}

export async function getSessionFromCookies(): Promise<SessionTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

export async function requireSession(): Promise<SessionTokenPayload> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new UnauthorizedError("Debes iniciar sesión para realizar esta acción.");
  }
  return session;
}
