/** Truncate post excerpts for blog index cards (SEO excerpt stays full in posts.ts). */

export function blogIndexExcerpt(text: string, maxChars = 88): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;

  const slice = trimmed.slice(0, maxChars + 1);
  const breakAt = slice.lastIndexOf(" ");
  const cut = breakAt > maxChars * 0.45 ? breakAt : maxChars;

  return `${trimmed.slice(0, cut).trim()}…`;
}
