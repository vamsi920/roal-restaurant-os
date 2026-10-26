import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { mailtoUsesPilotInbox } from "@/lib/landing/contact-mailto";
import { HOME_FAQ, PRICING_FAQ, SECURITY_FAQ } from "@/lib/landing/launch-faq";
import { PUBLIC_CTA, PUBLIC_CTA_PAIR } from "@/lib/landing/public-cta";
import {
  PUBLIC_HOME_HASH_IDS,
  PUBLIC_MARKETING_ROUTES,
  parsePublicHref,
  validatePublicHref,
} from "@/lib/landing/public-links";
import {
  SITE_FOOTER_COLUMNS,
  SITE_NAV_LINKS,
  SITE_NAV_SIGN_IN,
  SITE_NAV_TRY,
} from "@/lib/landing/site-nav";

const APP_DIR = join(process.cwd(), "app");
const BLOG_SLUGS = BLOG_POSTS.map((p) => p.slug);

function marketingPageExists(route: string): boolean {
  if (route === "/") return existsSync(join(APP_DIR, "page.tsx"));
  if (route === "/login") return existsSync(join(APP_DIR, "(auth)", "login", "page.tsx"));
  if (route === "/signup") return existsSync(join(APP_DIR, "(auth)", "signup", "page.tsx"));
  const segments = route.slice(1).split("/");
  return existsSync(join(APP_DIR, ...segments, "page.tsx"));
}

function collectMarketingHrefs(): string[] {
  const out: string[] = [];

  for (const link of SITE_NAV_LINKS) out.push(link.href);
  out.push(SITE_NAV_SIGN_IN.href, SITE_NAV_TRY.href);

  for (const column of SITE_FOOTER_COLUMNS) {
    for (const link of column.links) out.push(link.href);
  }

  for (const cta of Object.values(PUBLIC_CTA)) out.push(cta.href);
  out.push(PUBLIC_CTA_PAIR.primary.href, PUBLIC_CTA_PAIR.secondary.href);

  for (const item of [...HOME_FAQ.items, ...PRICING_FAQ, ...SECURITY_FAQ]) {
    if ("link" in item && item.link) out.push(item.link.href);
  }

  return out;
}

describe("cross-link QA", () => {
  it("every marketing route has an app page", () => {
    for (const route of PUBLIC_MARKETING_ROUTES) {
      expect(marketingPageExists(route), route).toBe(true);
    }
    expect(existsSync(join(APP_DIR, "blog", "[slug]", "page.tsx"))).toBe(true);
  });

  it("nav, footer, and CTA hrefs resolve to known routes or homepage hashes", () => {
    const hrefs = collectMarketingHrefs();
    expect(hrefs.length).toBeGreaterThan(10);

    for (const href of hrefs) {
      const result = validatePublicHref(href, { blogSlugs: BLOG_SLUGS });
      expect(result.ok, `${href}: ${!result.ok && "reason" in result ? result.reason : ""}`).toBe(
        true
      );
    }
  });

  it("mailto CTAs use the pilot inbox", () => {
    expect(mailtoUsesPilotInbox(PUBLIC_CTA.bookDemoMailto.href)).toBe(true);
  });

  it("homepage hash anchors used in nav and CTAs are declared", () => {
    const hashes = collectMarketingHrefs()
      .map((href) => parsePublicHref(href))
      .filter((parsed) => parsed.hash)
      .map((parsed) => parsed.hash);
    expect(hashes.length).toBeGreaterThan(0);
    for (const hash of hashes) {
      expect(PUBLIC_HOME_HASH_IDS, `#${hash}`).toContain(hash);
    }
  });

  it("validatePublicHref rejects unknown routes, hashes and blog slugs", () => {
    expect(validatePublicHref("/nope", { blogSlugs: BLOG_SLUGS }).ok).toBe(false);
    expect(validatePublicHref("/#nope", { blogSlugs: BLOG_SLUGS }).ok).toBe(false);
    expect(validatePublicHref("/pricing#how", { blogSlugs: BLOG_SLUGS }).ok).toBe(false);
    expect(validatePublicHref("/blog/not-a-post", { blogSlugs: BLOG_SLUGS }).ok).toBe(false);
    expect(validatePublicHref("mailto:x@y.z", { blogSlugs: BLOG_SLUGS }).ok).toBe(true);
    expect(validatePublicHref("https://example.com", { blogSlugs: BLOG_SLUGS }).ok).toBe(true);
  });
});
