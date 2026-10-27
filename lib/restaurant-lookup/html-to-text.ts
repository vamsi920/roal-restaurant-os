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

/** Same-origin links on a page that look like a menu page (e.g. "/menu/", "/food-menu"). */
export function discoverMenuLinks(html: string, pageUrl: string, limit = 3): string[] {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const match of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    let url: URL;
    try {
      url = new URL(match[1], base);
    } catch {
      continue;
    }
    if (url.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
    const path = url.pathname.toLowerCase();
    if (!/menu|food|dishes|our-food/.test(path)) continue;
    if (/catering|wp-content|\.(jpg|jpeg|png|webp|gif|css|js|xml)$/.test(path)) continue;
    const href = `${url.origin}${url.pathname}`;
    if (!found.includes(href)) found.push(href);
    if (found.length >= limit) break;
  }
  return found;
}

/**
 * Drop lines that repeat with the same neighbours seen earlier. Multi-location sites often
 * print the whole menu once per location; this keeps the first copy and any lines that
 * differ, while a shared price like "$4.99" next to a different item survives.
 */
export function collapseRepeatedBlocks(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const key = `${lines[i - 1] ?? ""}\n${lines[i]}\n${lines[i + 1] ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(lines[i]);
  }
  return kept.join("\n");
}
