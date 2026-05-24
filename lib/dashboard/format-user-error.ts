/** Dashboard surfaces — hide Postgres/JWT noise from owners. */
export function formatSupabaseClientError(
  message: string | null | undefined
): string {
  const m = message?.trim();
  if (!m) return "Something went wrong. Try again.";

  const lower = m.toLowerCase();
  if (
    lower.includes("jwt") ||
    lower.includes("not authenticated") ||
    lower.includes("session")
  ) {
    return "Sign in again to continue.";
  }
  if (
    lower.includes("permission") ||
    lower.includes("row-level") ||
    lower.includes("forbidden")
  ) {
    return "You do not have access to this data.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Connection problem. Check your network and try again.";
  }
  if (/pgrst|postgres|sql|violates|duplicate key|23505/i.test(m)) {
    return "Could not save changes. Try again or contact support.";
  }
  if (m.length > 200) {
    return "Something went wrong. Try again.";
  }
  return m;
}

export function formatApiRouteError(
  body: unknown,
  status: number,
  fallback: string
): string {
  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  const raw =
    (typeof record?.message === "string" && record.message) ||
    (typeof record?.error === "string" && record.error) ||
    null;

  if (status === 401) return "Sign in again to continue.";
  if (status === 403) return "You do not have permission for this action.";

  if (raw) {
    if (raw === "name is required") return "Restaurant name is required.";
    if (raw === "Forbidden") return "You do not have permission for this action.";
    return formatSupabaseClientError(raw);
  }

  if (status >= 500) return fallback;
  return fallback;
}
