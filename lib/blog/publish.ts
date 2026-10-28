/** Today's date (YYYY-MM-DD) in the restaurant's home time zone; posts dated after it stay hidden. */
export function blogToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isPublishedOn(publishedAt: string, today = blogToday()): boolean {
  return publishedAt <= today;
}

/** Revalidate blog surfaces hourly so scheduled posts appear on their day without a deploy. */
export const BLOG_REVALIDATE_SECONDS = 3600;
