const PUBLISHED_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` from post roster → ISO instant for OG/JSON-LD. */
export function blogPublishedInstant(isoDate: string): string {
  if (!PUBLISHED_DATE_RE.test(isoDate)) {
    throw new Error(`[blog] invalid publishedAt ${isoDate} (expected YYYY-MM-DD)`);
  }
  return `${isoDate}T12:00:00.000Z`;
}

export function isValidBlogPublishedDate(isoDate: string): boolean {
  if (!PUBLISHED_DATE_RE.test(isoDate)) return false;
  const parsed = new Date(`${isoDate}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}
