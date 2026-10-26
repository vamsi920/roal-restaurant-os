const MENU_PATHS = ["/menu", "/our-menu", "/order", "/food", "/menu.html"];

export function htmlToPlainText(html: string, maxChars = 80_000): string {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const text = withoutNoise
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.slice(0, maxChars);
}

export function menuCandidateUrls(website: string): string[] {
  let origin: string;
  try {
    origin = new URL(website).origin;
  } catch {
    return [];
  }
  const urls = [website, ...MENU_PATHS.map((path) => `${origin}${path}`)];
  return [...new Set(urls)];
}

export function priceSignalScore(text: string): number {
  const matches = text.match(/(?:\$\s?\d+(?:\.\d{2})?|\d+\.\d{2})/g);
  return matches?.length ?? 0;
}
