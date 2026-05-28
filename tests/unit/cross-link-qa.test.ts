import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { ABOUT_PAGE_COPY } from "@/lib/landing/about-page-copy";
import { CONTACT_CTA } from "@/lib/landing/contact-page-copy";
import { CONTACT_PILOT_EMAIL, mailtoUsesPilotInbox } from "@/lib/landing/contact-mailto";
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_PLATFORM_LINKS,
  FOOTER_PRODUCT_LINKS,
  LANDING_FOOTER,
} from "@/lib/landing/footer-copy";
import { HOME_FAQ } from "@/lib/landing/launch-faq";
import { PUBLIC_CTA } from "@/lib/landing/public-cta";
import {
  PUBLIC_HOME_HASH_IDS,
  PUBLIC_MARKETING_ROUTES,
  validatePublicHref,
} from "@/lib/landing/public-links";
import {
  PUBLIC_NAV_LINKS,
  PUBLIC_NAV_LOGIN,
  PUBLIC_NAV_SIGNUP,
} from "@/lib/landing/public-nav";
import { SECURITY_CTA } from "@/lib/landing/security-page-copy";

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

  for (const link of PUBLIC_NAV_LINKS) out.push(link.href);
  out.push(PUBLIC_NAV_LOGIN.href, PUBLIC_NAV_SIGNUP.href);

  for (const link of LANDING_FOOTER.essentialLinks) out.push(link.href);
  out.push(LANDING_FOOTER.brandHref, LANDING_FOOTER.demoCta.href, LANDING_FOOTER.contactCta.href);

  for (const cta of Object.values(PUBLIC_CTA)) out.push(cta.href);
  for (const cta of Object.values(SECURITY_CTA)) out.push(cta.href);
  for (const cta of Object.values(CONTACT_CTA)) out.push(cta.href);

  for (const link of ABOUT_PAGE_COPY.resources.links) out.push(link.href);
  for (const item of ABOUT_PAGE_COPY.values.items) {
    if (item.link) out.push(item.link.href);
  }

  for (const item of HOME_FAQ.items) {
    if (item.link) out.push(item.link.href);
  }

  for (const links of [FOOTER_PRODUCT_LINKS, FOOTER_COMPANY_LINKS, FOOTER_PLATFORM_LINKS]) {
    for (const link of links) out.push(link.href);
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
    expect(mailtoUsesPilotInbox(CONTACT_CTA.bookDemo.href)).toBe(true);
  });

  it("homepage hash anchors used in copy have matching ids", () => {
    expect(existsSync(join(process.cwd(), "components/landing/home/sections/home-how-it-works.tsx"))).toBe(
      true
    );
    const how = readFileSnippet("components/landing/home/sections/home-how-it-works.tsx");
    const solution = readFileSnippet("components/landing/home/sections/home-solution.tsx");
    const metrics = readFileSnippet("components/landing/public/public-metrics-strip.tsx");

    expect(how).toContain('id="how"');
    expect(solution).toContain('id="trust"');
    expect(metrics).toContain('id={home ? "proof"');
    expect(PUBLIC_HOME_HASH_IDS).toEqual(["how", "trust", "proof"]);
  });
});

function readFileSnippet(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}
