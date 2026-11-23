import {
  getSessionFromCookies,
  hashPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from "@/lib/auth";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import {
  toSessionUserDTO,
  userRepository,
} from "@/repositories/user.repository";
import type { SessionUserDTO } from "@/types/user";
import { loginSchema, registerSchema } from "@/validators/auth.validator";

const INVALID_CREDENTIALS_MESSAGE =
  "Correo electrónico o contraseña incorrectos.";

const DUPLICATE_EMAIL_MESSAGE =
  "Ya existe una cuenta registrada con ese correo electrónico.";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export interface AuthResult {
  user: SessionUserDTO;
  token: string;
}

export async function registerUser(rawInput: unknown): Promise<AuthResult> {
  const input = registerSchema.parse(rawInput);

  const existingUser = await userRepository.findByEmail(input.email);
  if (existingUser) {
    throw new ConflictError(DUPLICATE_EMAIL_MESSAGE);
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const createdUser = await userRepository.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      program: input.program,
      contactPhone: input.contactPhone,
      createdAt: new Date(),
    });

    const token = await signSessionToken({
      sub: createdUser._id.toHexString(),
      email: createdUser.email,
      fullName: createdUser.fullName,
    });

    return {
      user: toSessionUserDTO(createdUser),
      token,
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ConflictError(DUPLICATE_EMAIL_MESSAGE);
    }
    throw error;
  }
}

export async function loginUser(rawInput: unknown): Promise<AuthResult> {
  const input = loginSchema.parse(rawInput);

  const user = await userRepository.findByEmail(input.email);
  if (!user) {
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  const isPasswordValid = await verifyPassword(
    input.password,
    user.passwordHash,
  );
  if (!isPasswordValid) {
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  const token = await signSessionToken({
    sub: user._id.toHexString(),
    email: user.email,
    fullName: user.fullName,
  });

  return {
    user: toSessionUserDTO(user),
    token,
  };
}

export async function getUserFromSessionToken(
  token: string | undefined | null,
): Promise<SessionUserDTO | null> {
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return null;
  }

  const user = await userRepository.findById(payload.sub);
  if (!user) {
    return null;
  }

  return toSessionUserDTO(user);
}

export async function getCurrentSessionUser(): Promise<SessionUserDTO | null> {
  const payload = await getSessionFromCookies();
  if (!payload) {
    return null;
  }

  const user = await userRepository.findById(payload.sub);
  if (!user) {
    return null;
  }

  return toSessionUserDTO(user);
}

export const authService = {
  registerUser,
  loginUser,
  getUserFromSessionToken,
  getCurrentSessionUser,
};
