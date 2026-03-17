export class ApiError extends Error {
  statusCode?: number;
  isNetworkError: boolean;

  constructor(message: string, statusCode?: number, isNetworkError = false) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.isNetworkError = isNetworkError;
  }
}

export function extractApiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  const error = data.error as Record<string, unknown> | undefined;
  if (error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  const details = error?.details;
  if (Array.isArray(details) && details.length > 0) {
    const first = details[0] as Record<string, unknown>;
    const message = first?.message;
    if (Array.isArray(message) && message.length > 0 && typeof message[0] === "string") {
      return message[0];
    }
    if (typeof message === "string") {
      return message;
    }
  }

  return null;
}
