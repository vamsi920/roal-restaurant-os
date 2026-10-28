/** Strips markdown links and emphasis for JSON-LD, meta tags and plain-text feeds. */
export function mdPlain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\s][^*]*)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "");
}
