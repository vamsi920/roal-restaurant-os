const FORBIDDEN_KEY_RE =
  /^(authorization|cookie|token|secret|password|api[_-]?key|bearer|phone|customer_phone|customer_name|items|cart|raw|body|headers?)$/i;

const FORBIDDEN_VALUE_RE =
  /^(bearer\s+|roal1\.|eyJ[a-zA-Z0-9_-]*\.eyJ)/i;

function scrubValue(value: unknown, depth: number): unknown {
  if (depth > 4) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (FORBIDDEN_VALUE_RE.test(value)) return "[redacted]";
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => scrubValue(v, depth + 1));
  }
  if (typeof value === "object") {
    return scrubObject(value as Record<string, unknown>, depth + 1);
  }
  return String(value);
}

function scrubObject(
  obj: Record<string, unknown>,
  depth: number
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_KEY_RE.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = scrubValue(value, depth);
  }
  return out;
}

/** Strip secrets and PII before persisting usage metadata. */
export function sanitizeUsageMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") return {};
  return scrubObject(metadata, 0);
}

export function truncateSessionId(sessionId: string | null | undefined): string | null {
  if (!sessionId) return null;
  const trimmed = sessionId.trim();
  if (!trimmed) return null;
  return trimmed.length > 128 ? trimmed.slice(0, 128) : trimmed;
}
