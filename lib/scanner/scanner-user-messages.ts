/** Owner-facing copy for menu scanner API failures (no secrets). */
export function formatScannerApiError(
  body: unknown,
  status: number
): string {
  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  const raw =
    (typeof record?.message === "string" && record.message) ||
    (typeof record?.error === "string" && record.error) ||
    null;

  if (record && typeof record.error === "string" && record.error.includes("plan")) {
    return record.error;
  }

  if (status === 401 || status === 403) {
    return "Sign in again or ask your organization owner for access to this restaurant.";
  }

  if (status === 503 || raw?.includes("Environment configuration")) {
    return "Menu scanning is not available right now. Add items manually in the menu editor, or try again later.";
  }

  if (status === 422 || raw?.includes("invalid menu structure")) {
    return "We could not read a valid menu from this photo. Try a clearer image with readable item names and prices.";
  }

  if (status === 502) {
    return "Menu scan failed. Check your connection and try a well-lit photo with the full menu in frame.";
  }

  if (raw) {
    const lower = raw.toLowerCase();
    if (
      lower.includes("not an image") ||
      lower.includes("8 mb") ||
      lower.includes("empty")
    ) {
      return raw;
    }
    if (lower.includes("upload and scan")) {
      return raw;
    }
    if (raw.length > 240) {
      return `${raw.slice(0, 240).trim()}…`;
    }
    return raw;
  }

  if (status === 400) {
    return "Could not upload this file. Use a PNG, JPG, or WebP under 8 MB.";
  }

  return "Menu scan failed. Try another photo or add items manually from the menu editor.";
}
