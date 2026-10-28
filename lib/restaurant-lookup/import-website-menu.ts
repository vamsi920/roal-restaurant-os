import { extractMenuFromWebsiteText } from "@/lib/ai";
import { ScannedMenuSchema } from "@/lib/menu-import/types";
import {
  collapseRepeatedBlocks,
  discoverMenuLinks,
  htmlToPlainText,
  menuCandidateUrls,
  priceSignalScore,
} from "@/lib/restaurant-lookup/html-to-text";
import { scannedMenuHasPricedItems } from "@/lib/restaurant-lookup/priced-menu";
import type { WebsiteMenuImportResult } from "@/lib/restaurant-lookup/types";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 400_000;

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

async function fetchHtml(
  url: string,
  fetchImpl: FetchFn
): Promise<string | null> {
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "ROAL-menu-import/1.0 (+https://tryroal.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !/text\/html|application\/xhtml/i.test(contentType) && !contentType.includes("text/plain")) {
      return null;
    }
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    return new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch {
    return null;
  }
}

export async function importWebsiteMenuFromUrl(
  website: string | null | undefined,
  deps?: {
    fetchImpl?: FetchFn;
    extractText?: typeof extractMenuFromWebsiteText;
  }
): Promise<WebsiteMenuImportResult> {
  const site = website?.trim() || "";
  if (!site) {
    return { ok: false, reason: "no_website", message: "No website on this listing." };
  }

  const urls = menuCandidateUrls(site);
  if (urls.length === 0) {
    return { ok: false, reason: "no_website", message: "Website URL is invalid." };
  }

  const fetchImpl = deps?.fetchImpl ?? fetch;
  let bestText = "";
  let bestUrl = urls[0];
  let bestScore = -1;
  let fetchedAny = false;

  const consider = (url: string, html: string | null) => {
    if (html == null) return;
    fetchedAny = true;
    const text = htmlToPlainText(html);
    const score = priceSignalScore(text);
    if (score > bestScore || (score === bestScore && text.length > bestText.length)) {
      bestScore = score;
      bestText = text;
      bestUrl = url;
    }
  };

  // Fetch the common menu paths in parallel, then any menu links the homepage points to.
  const pages = await Promise.all(urls.map((url) => fetchHtml(url, fetchImpl)));
  pages.forEach((html, idx) => consider(urls[idx], html));

  const bare = (u: string) => u.replace(/\/+$/, "");
  const tried = new Set(urls.map(bare));
  const linked = pages[0] ? discoverMenuLinks(pages[0], urls[0]).filter((u) => !tried.has(bare(u))) : [];
  const linkedPages = await Promise.all(linked.map((url) => fetchHtml(url, fetchImpl)));
  linkedPages.forEach((html, idx) => consider(linked[idx], html));

  if (!fetchedAny) {
    return {
      ok: false,
      reason: "fetch_failed",
      message: "Could not load the restaurant website. Scan a menu photo instead.",
    };
  }

  if (bestText.trim().length < 80) {
    return {
      ok: false,
      reason: "empty",
      message: "The website did not include a readable menu. Scan a menu photo instead.",
    };
  }

  try {
    const extract = deps?.extractText ?? extractMenuFromWebsiteText;
    const scan = await extract(collapseRepeatedBlocks(bestText));
    const parsed = ScannedMenuSchema.safeParse(scan.data);
    if (!parsed.success || !scannedMenuHasPricedItems(parsed.data)) {
      return {
        ok: false,
        reason: "unpriced",
        message:
          "No priced items on the website menu. Delivery-only pages need a photo scan.",
      };
    }
    return {
      ok: true,
      menu: parsed.data,
      sourceUrl: bestUrl,
      modelUsed: scan.modelUsed,
    };
  } catch (e) {
    return {
      ok: false,
      reason: "parse_failed",
      message: e instanceof Error ? e.message : "Could not parse the website menu.",
    };
  }
}
