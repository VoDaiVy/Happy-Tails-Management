type ApiEnvelope<T = unknown> = {
  success?: boolean;
  status?: string;
  message?: unknown;
  data?: T;
  pagination?: unknown;
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractPayload<T>(raw: unknown): T {
  if (!isRecord(raw)) {
    return raw as T;
  }

  const envelope = raw as ApiEnvelope<T>;

  if (Object.prototype.hasOwnProperty.call(envelope, "data")) {
    return envelope.data as T;
  }

  if (isRecord(envelope.message)) {
    return envelope.message as T;
  }

  return raw as T;
}

export function extractPagination<T = unknown>(raw: unknown): T | null {
  if (!isRecord(raw)) return null;

  if (Object.prototype.hasOwnProperty.call(raw, "pagination")) {
    return raw.pagination as T;
  }

  const payload = extractPayload<Record<string, unknown>>(raw);
  if (isRecord(payload) && Object.prototype.hasOwnProperty.call(payload, "pagination")) {
    return payload.pagination as T;
  }

  return null;
}
