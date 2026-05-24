/** Same-origin relative path only — blocks open redirects via `//` or backslashes. */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\") || next.includes("://")) return fallback;
  return next;
}
