export const REQUEST_ID_HEADER = "x-request-id";

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getRequestIdFromHeaders(
  headers: Headers | { get(name: string): string | null }
): string | null {
  const value = headers.get(REQUEST_ID_HEADER);
  return value?.trim() || null;
}

export function getOrCreateRequestId(
  headers: Headers | { get(name: string): string | null }
): string {
  return getRequestIdFromHeaders(headers) ?? generateRequestId();
}
