import { extractMenuFromDocument, extractMenuFromWebsiteText, findMenuUrlsOnWeb, readMenuViaWebSearch } from "@/lib/ai";
import { ScannedMenuSchema, type ScannedMenu } from "@/lib/menu-import/types";
import {
  collapseRepeatedBlocks,
  discoverMenuLinks,
  htmlToPlainText,
  menuCandidateUrls,
  priceSignalScore,
} from "@/lib/restaurant-lookup/html-to-text";
import { scannedMenuHasPricedItems } from "@/lib/restaurant-lookup/priced-menu";

/**
 * Second-chance menu finder, run when the restaurant's own site had no priced menu:
 *   1. menus the site publishes as PDFs or photos,
 *   2. pages a web search finds (own ordering page, Slice/Toast, menu directories, PDFs),
 *   3. last resort: the search model reads a bot-walled page (Toast) and names its source.
 * Pages we fetch and read ourselves always win over (3).
 */

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 600_000;
const MAX_DOC_BYTES = 10_000_000;
/** A page needs at least this many prices before we spend an extraction on it. */
const MIN_PRICES = 6;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export type FetchedResource =
  | { kind: "html"; url: string; html: string; text: string; prices: number }
  | { kind: "pdf" | "image"; url: string; base64: string; mimeType: string };

export type DeepMenuSource = "web" | "pdf" | "image" | "search";

export type DeepMenuResult =
  | { ok: true; menu: ScannedMenu; sourceUrl: string; via: DeepMenuSource; itemCount: number }
  | { ok: false; message: string; tried: number };

/** Only public http(s) hosts: no localhost, private ranges, link-local or cloud metadata. */
export function isPublicHttpUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host.includes(".") || host === "localhost" || /\.(local|internal|localhost)$/.test(host)) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) {
      return false;
    }
  }
  if (host.includes(":")) return false; // IPv6 literals
  return true;
}

export async function fetchResource(url: string, fetchImpl: FetchFn = fetch): Promise<FetchedResource | null> {
  if (!isPublicHttpUrl(url)) return null;
  try {
    const res = await fetchImpl(url, {
      redirect: "follow",
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/pdf,image/*;q=0.8,*/*;q=0.5" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const isPdf = type === "application/pdf" || (!type && /\.pdf($|\?)/i.test(url));
    const isImage = /^image\/(jpeg|png|webp|gif)$/.test(type);
    if (isPdf || isImage) {
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_DOC_BYTES || buf.byteLength < 2_000) return null;
      return {
        kind: isPdf ? "pdf" : "image",
        url,
        base64: Buffer.from(buf).toString("base64"),
        mimeType: isPdf ? "application/pdf" : type,
      };
    }
    if (type && !/text\/html|application\/xhtml|text\/plain/.test(type)) return null;
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf);
    const text = htmlToPlainText(html);
    return { kind: "html", url, html, text, prices: priceSignalScore(text) };
  } catch {
    return null;
  }
}

/** PDF links and menu photos a page points to ("Download our menu", menu-board images). */
export function discoverMenuDocuments(html: string, pageUrl: string, limit = 3): string[] {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }
  const pdfs: string[] = [];
  const images: string[] = [];
  const add = (list: string[], raw: string) => {
    try {
      const u = new URL(raw, base).toString();
      if (!list.includes(u)) list.push(u);
    } catch {
      /* ignore bad hrefs */
    }
  };
  for (const m of html.matchAll(/href\s*=\s*["']([^"'#]+\.pdf(?:\?[^"']*)?)["']/gi)) {
    add(pdfs, m[1]);
  }
  // Images whose file name or alt text says "menu", excluding banners, thumbnails and logos.
  for (const m of html.matchAll(/<(?:img|a)\b[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/\b(?:data-src|src|href)\s*=\s*["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/i)?.[1];
    if (!src) continue;
    const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    const hay = `${src} ${alt}`.toLowerCase();
    if (!/menu/.test(hay) || /banner|thumb|logo|icon|hero|header|bg[-_]|background|-\d{2,3}x\d{2,3}\./.test(hay)) continue;
    add(images, src);
  }
  // PDFs first: they hold the whole menu; photos can be one page of several.
  const menuFirst = (list: string[]) => [...list.filter((u) => /menu/i.test(u)), ...list.filter((u) => !/menu/i.test(u))];
  return [...menuFirst(pdfs), ...images].slice(0, limit);
}

function countPricedItems(menu: ScannedMenu): number {
  return menu.categories.reduce((n, c) => n + c.items.filter((i) => typeof i.price === "number" && i.price > 0).length, 0);
}

async function extractFrom(resource: FetchedResource): Promise<{ menu: ScannedMenu; via: DeepMenuSource } | null> {
  try {
    const scan =
      resource.kind === "html"
        ? await extractMenuFromWebsiteText(collapseRepeatedBlocks(resource.text))
        : await extractMenuFromDocument(resource.base64, resource.mimeType);
    const parsed = ScannedMenuSchema.safeParse(scan.data);
    if (!parsed.success || !scannedMenuHasPricedItems(parsed.data)) return null;
    return { menu: parsed.data, via: resource.kind === "html" ? "web" : resource.kind };
  } catch (e) {
    console.error("[deep menu] extract failed", resource.url, e instanceof Error ? e.message : e);
    return null;
  }
}

export type DeepMenuQuery = {
  name: string;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
};

/** Find and read the best priced menu anywhere we can reach it. */
export async function deepMenuSearch(
  query: DeepMenuQuery,
  deps?: {
    fetchImpl?: FetchFn;
    searchWeb?: typeof findMenuUrlsOnWeb;
    extract?: typeof extractFrom;
    searchRead?: typeof readMenuViaWebSearch | null;
  }
): Promise<DeepMenuResult> {
  const fetchImpl = deps?.fetchImpl ?? fetch;
  const searchWeb = deps?.searchWeb ?? findMenuUrlsOnWeb;
  const extract = deps?.extract ?? extractFrom;
  const searchRead = deps?.searchRead === undefined ? readMenuViaWebSearch : deps.searchRead;
  const label = [query.name, query.address, query.city, query.region].filter(Boolean).join(", ");

  // Started now so it costs no extra time; only used if everything below comes up empty.
  const lastResort = searchRead
    ? searchRead(label).catch((e) => {
        console.error("[deep menu] search read failed", e instanceof Error ? e.message : e);
        return null;
      })
    : Promise.resolve(null);
  const withLastResort = async (fallback: DeepMenuResult): Promise<DeepMenuResult> => {
    const read = await lastResort;
    if (!read) return fallback;
    const parsed = ScannedMenuSchema.safeParse(read.data);
    if (!parsed.success || !scannedMenuHasPricedItems(parsed.data) || countPricedItems(parsed.data) < 3) return fallback;
    return { ok: true, menu: parsed.data, sourceUrl: read.sourceUrl, via: "search", itemCount: countPricedItems(parsed.data) };
  };

  // 1 + 2 in parallel: documents linked from the site, and a web search.
  const sitePages = async (): Promise<string[]> => {
    if (!query.website) return [];
    const urls = menuCandidateUrls(query.website).slice(0, 4);
    const pages = await Promise.all(urls.map((u) => fetchResource(u, fetchImpl)));
    const docs: string[] = [];
    for (const page of pages) {
      if (page?.kind !== "html") continue;
      docs.push(...discoverMenuDocuments(page.html, page.url));
      for (const link of discoverMenuLinks(page.html, page.url, 2)) docs.push(link);
    }
    return [...new Set(docs)];
  };
  const [siteDocs, webUrls] = await Promise.all([
    sitePages().catch(() => [] as string[]),
    searchWeb(label).catch((e) => {
      console.error("[deep menu] search failed", e instanceof Error ? e.message : e);
      return [] as string[];
    }),
  ]);

  const candidates = [...new Set([...siteDocs, ...webUrls])].filter(isPublicHttpUrl).slice(0, 8);
  if (candidates.length === 0) {
    return withLastResort({ ok: false, message: "We couldn't find your menu anywhere online.", tried: 0 });
  }

  const fetched = (await Promise.all(candidates.map((u) => fetchResource(u, fetchImpl)))).filter(
    (r): r is FetchedResource => r != null && (r.kind !== "html" || r.prices >= MIN_PRICES)
  );
  if (fetched.length === 0) {
    return withLastResort({ ok: false, message: "Menu pages we found online were blocked or had no prices.", tried: candidates.length });
  }

  // Read the strongest two in parallel: the page with the most prices and the first PDF/photo.
  const pages = fetched.filter((r) => r.kind === "html").sort((a, b) => (b as { prices: number }).prices - (a as { prices: number }).prices);
  const docs = fetched.filter((r) => r.kind !== "html");
  const picks = [pages[0], docs[0], pages[1] ?? docs[1]].filter(Boolean).slice(0, 2) as FetchedResource[];

  const results = await Promise.all(picks.map(async (r) => ({ r, out: await extract(r) })));
  let best: { menu: ScannedMenu; via: DeepMenuSource; url: string; count: number } | null = null;
  for (const { r, out } of results) {
    if (!out) continue;
    const count = countPricedItems(out.menu);
    if (!best || count > best.count) best = { ...out, url: r.url, count };
  }
  if (!best) {
    return withLastResort({ ok: false, message: "We found menu pages online but couldn't read prices from them.", tried: candidates.length });
  }
  return { ok: true, menu: best.menu, sourceUrl: best.url, via: best.via, itemCount: best.count };
}
