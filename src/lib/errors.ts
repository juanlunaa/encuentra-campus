import { ZodError } from "zod";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "EXTERNAL_SERVICE_ERROR"
  | "INTERNAL_SERVER_ERROR";

export interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Los datos enviados no son válidos.",
    details?: Record<string, string[]>,
  ) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Debes iniciar sesión para realizar esta acción.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No tienes permisos para realizar esta acción.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "El recurso solicitado no fue encontrado.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(
    message = "La operación no se puede completar por un conflicto con el estado actual.",
  ) {
    super(message, 409, "CONFLICT");
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "El archivo supera el tamaño máximo permitido de 5 MB.") {
    super(message, 413, "PAYLOAD_TOO_LARGE");
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    message = "Ocurrió un error al comunicarse con un servicio externo. Intenta nuevamente.",
  ) {
    super(message, 502, "EXTERNAL_SERVICE_ERROR");
  }
}

function formatZodError(error: ZodError): {
  message: string;
  details: Record<string, string[]>;
} {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join(".") : "_general";
    if (!details[field]) {
      details[field] = [];
    }
    details[field].push(issue.message);
  }

  const firstMessage =
    error.issues[0]?.message ?? "Revisa los campos obligatorios e intenta nuevamente.";

  return { message: firstMessage, details };
}

function getMongoErrorCode(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "number") {
      return code;
    }
  }
  return undefined;
}

export function buildErrorPayload(error: unknown): {
  statusCode: number;
  body: ErrorResponseBody;
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
    };
  }

  if (error instanceof ZodError) {
    const { message, details } = formatZodError(error);
    return {
      statusCode: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message,
          details,
        },
      },
    };
  }

  const mongoCode = getMongoErrorCode(error);
  if (mongoCode === 11000) {
    return {
      statusCode: 409,
      body: {
        error: {
          code: "CONFLICT",
          message: "Ya existe un registro con esos datos únicos.",
        },
      },
    };
  }

  if (mongoCode === 121) {
    return {
      statusCode: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Los datos no cumplen con la estructura requerida por la base de datos.",
        },
      },
    };
  }

  console.error("[API Error]", error);

  return {
    statusCode: 500,
    body: {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error interno en el servidor. Intenta nuevamente más tarde.",
      },
    },
  };
}

export function toErrorResponse(error: unknown): Response {
  const { statusCode, body } = buildErrorPayload(error);
  return Response.json(body, { status: statusCode });
}
