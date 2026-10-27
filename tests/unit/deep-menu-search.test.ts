import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai", () => ({
  extractMenuFromDocument: vi.fn(),
  extractMenuFromWebsiteText: vi.fn(),
  findMenuUrlsOnWeb: vi.fn(),
  readMenuViaWebSearch: vi.fn(async () => null),
}));

import {
  deepMenuSearch,
  discoverMenuDocuments,
  isPublicHttpUrl,
  type FetchedResource,
} from "@/lib/restaurant-lookup/deep-menu-search";
import type { ScannedMenu } from "@/lib/menu-import/types";

const priced = (n: number): ScannedMenu =>
  ({
    categories: [
      {
        name: "Mains",
        items: Array.from({ length: n }, (_, i) => ({ name: `Item ${i}`, price: 5 + i, base_availability: true, modifiers: [] })),
      },
    ],
  }) as unknown as ScannedMenu;

function htmlResponse(body: string) {
  return new Response(body, { status: 200, headers: { "content-type": "text/html" } });
}

describe("isPublicHttpUrl", () => {
  it("allows public sites and blocks internal addresses", () => {
    expect(isPublicHttpUrl("https://www.allmenus.com/ny/menu")).toBe(true);
    expect(isPublicHttpUrl("http://localhost:3000/menu")).toBe(false);
    expect(isPublicHttpUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isPublicHttpUrl("http://10.0.0.5/menu")).toBe(false);
    expect(isPublicHttpUrl("http://192.168.1.1/")).toBe(false);
    expect(isPublicHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isPublicHttpUrl("http://[::1]/")).toBe(false);
  });
});

describe("discoverMenuDocuments", () => {
  it("finds menu PDFs first, then menu photos, skipping banners and thumbnails", () => {
    const html = `
      <a href="/files/catering.pdf">Catering</a>
      <a href="/wp-content/uploads/dinner-menu.pdf">Dinner menu</a>
      <img src="/img/menu-banner.jpg" alt="menu">
      <img src="/img/menu-thumbs/omelet.jpg">
      <img src="/img/board.jpg" alt="Our full menu">
      <img src="/img/logo.png" alt="logo">`;
    expect(discoverMenuDocuments(html, "https://eats.example.com/menu/")).toEqual([
      "https://eats.example.com/wp-content/uploads/dinner-menu.pdf",
      "https://eats.example.com/files/catering.pdf",
      "https://eats.example.com/img/board.jpg",
    ]);
  });
});

describe("deepMenuSearch", () => {
  it("uses web search results and keeps the menu with the most priced items", async () => {
    const pages: Record<string, string> = {
      "https://slice.example.com/joes/menu": `<main>${"Slice $3.50\n".repeat(20)}</main>`,
      "https://dir.example.com/joes": `<main>${"Pie $20.00\n".repeat(8)}</main>`,
    };
    const fetchImpl = vi.fn(async (url: string) => (pages[url] ? htmlResponse(pages[url]) : new Response("", { status: 404 })));
    const extract = vi.fn(async (r: FetchedResource) => ({
      menu: priced(r.url.includes("slice") ? 30 : 8),
      via: "web" as const,
    }));

    const out = await deepMenuSearch(
      { name: "Joe's Pizza", city: "New York", region: "NY" },
      { fetchImpl: fetchImpl as never, searchWeb: async () => Object.keys(pages), extract: extract as never }
    );

    expect(out).toMatchObject({ ok: true, sourceUrl: "https://slice.example.com/joes/menu", via: "web", itemCount: 30 });
  });

  it("skips pages without prices and reports what happened", async () => {
    const fetchImpl = vi.fn(async () => htmlResponse("<p>Please enable JavaScript</p>"));
    const out = await deepMenuSearch(
      { name: "Nowhere Cafe" },
      { fetchImpl: fetchImpl as never, searchWeb: async () => ["https://blocked.example.com/menu"] }
    );
    expect(out).toEqual({ ok: false, message: "Menu pages we found online were blocked or had no prices.", tried: 1 });
  });

  it("falls back to the search model's reading only when nothing fetchable worked, keeping its source", async () => {
    const fetchImpl = vi.fn(async () => htmlResponse("<p>Just a moment...</p>"));
    const searchRead = vi.fn(async () => ({
      sourceUrl: "https://kati.toast.site/menu",
      data: priced(5),
    }));
    const out = await deepMenuSearch(
      { name: "Kati Roll" },
      { fetchImpl: fetchImpl as never, searchWeb: async () => ["https://kati.toast.site/menu"], searchRead: searchRead as never }
    );
    expect(out).toMatchObject({ ok: true, via: "search", sourceUrl: "https://kati.toast.site/menu", itemCount: 5 });
  });

  it("never fetches internal addresses a search result might contain", async () => {
    const fetchImpl = vi.fn(async () => htmlResponse(""));
    const out = await deepMenuSearch(
      { name: "X" },
      { fetchImpl: fetchImpl as never, searchWeb: async () => ["http://169.254.169.254/menu", "http://localhost/menu"] }
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(out.ok).toBe(false);
  });
});
