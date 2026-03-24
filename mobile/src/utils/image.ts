import { env } from "../config/env";

function getApiOrigin() {
  const base = String(env.apiBaseUrl || "").trim();
  if (!base) return "";

  const withoutApiSuffix = base.replace(/\/api\/?$/i, "");

  try {
    const parsed = new URL(withoutApiSuffix);
    return parsed.origin;
  } catch {
    return withoutApiSuffix.replace(/\/$/, "");
  }
}

export function resolveImageUrl(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = raw.replace(/\\/g, "/");

  if (
    normalized.startsWith("data:image") ||
    normalized.startsWith("file://") ||
    normalized.startsWith("content://") ||
    normalized.startsWith("ph://")
  ) {
    return normalized;
  }

  if (normalized.startsWith("//")) {
    return `https:${normalized}`;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const apiOrigin = getApiOrigin();
  if (!apiOrigin) return normalized;

  if (normalized.startsWith("/")) {
    return `${apiOrigin}${normalized}`;
  }

  if (normalized.startsWith("uploads/")) {
    return `${apiOrigin}/${normalized}`;
  }

  if (normalized.startsWith("api/")) {
    return `${apiOrigin}/${normalized.slice(4)}`;
  }

  return `${apiOrigin}/${normalized}`;
}

export function resolveImageList(values?: Array<string | null | undefined>) {
  if (!Array.isArray(values)) return [];
  return values.map((item) => resolveImageUrl(item)).filter(Boolean);
}
