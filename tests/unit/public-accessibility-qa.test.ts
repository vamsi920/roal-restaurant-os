import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DASHBOARD_NAV_HREFS } from "@/lib/dashboard-nav";

const REPO = join(import.meta.dirname, "../..");

const PUBLIC_ROUTE_FILES = [
  { route: "/", shell: "components/landing/home/landing-home-shell.tsx", main: "#main" },
  {
    route: "/pricing",
    shell: "components/landing/public/public-page-shell.tsx",
    main: "#main",
  },
  { route: "/login", shell: "app/(auth)/layout.tsx", main: "#auth-main" },
] as const;

function read(path: string): string {
  return readFileSync(join(REPO, path), "utf8");
}

describe("public accessibility QA", () => {
  it("marketing and home shells expose main landmark and header", () => {
    for (const { shell } of PUBLIC_ROUTE_FILES) {
      const src = read(shell);
      expect(src).not.toMatch(/skip to content/i);
      expect(src).toMatch(/<main[\s>]/);
    }

    const nav = read("components/landing/public/public-marketing-nav.tsx");
    const drawer = read("components/landing/public/public-nav-drawer-panel.tsx");
    expect(nav).toContain("<header");
    expect(nav).toContain("shellClassName");
    expect(nav).toContain('aria-label="Primary"');
    expect(drawer).toContain('role="dialog"');
  });

  it("public theme defines focus-visible and reduced-motion fallbacks", () => {
    const theme = read("app/public-theme.css");
    const home = read("app/landing-home.css");

    expect(theme).toContain(":focus-visible");
    expect(theme).toContain("--public-focus-ring");
    expect(theme).toContain(".public-btn-ghost:focus-visible");
    expect(theme).toContain(".public-faq__accordion-q:focus-visible");
    expect(theme).toContain("prefers-reduced-motion: reduce");
    expect(home).toContain("prefers-reduced-motion: reduce");
    expect(theme).toContain("animation: none !important");
  });

  it("mobile nav drawer has dialog semantics and keyboard trap", () => {
    const nav = read("components/landing/public/public-marketing-nav.tsx");
    const drawer = read("components/landing/public/public-nav-drawer-panel.tsx");
    const hook = read("lib/landing/use-public-nav-menu.ts");

    expect(nav).toContain('aria-expanded={menuOpen}');
    expect(nav).toContain("PublicNavDrawerPanel");
    expect(drawer).toContain('role="dialog"');
    expect(drawer).toContain('aria-modal="true"');
    expect(drawer).toContain("public-nav-drawer__close");
    expect(nav).toContain("sr-only");
    expect(hook).toContain("Escape");
    expect(hook).toContain("Tab");
  });

  it("auth and contact forms use labels, alerts, and describedby", () => {
    const auth = read("components/auth/auth-form.tsx");
    const contact = read("components/landing/contact/contact-pilot-form.tsx");
    const field = read("components/landing/public/public-form-field.tsx");

    expect(auth).toContain("PublicFormField");
    expect(auth).toContain('role="alert"');
    expect(auth).toContain("describedBy={hasError ? errorId : undefined}");
    expect(auth).toContain("aria-labelledby");
    expect(field).toContain("aria-invalid");

    expect(contact).toContain("aria-labelledby");
    expect(contact).toContain('role="alert"');
    expect(contact).toContain('aria-live="polite"');

    expect(field).toContain("htmlFor");
    expect(field).toContain("aria-required");
    expect(read("app/public-theme.css")).toContain(".public-form-field__input:focus-visible");
  });

  it("page heroes use a single h1; sections use h2 landmarks", () => {
    const hero = read("components/landing/public/public-page-hero.tsx");
    const homeHero = read("components/landing/home/landing-home-hero.tsx");
    const aeo = read("components/landing/launch-aeo-answer.tsx");

    expect(hero).toMatch(/<h1[\s>]/);
    expect(homeHero).toMatch(/<h1[\s>]/);
    expect(aeo).toMatch(/<h2[\s>]/);
    expect(hero).toContain("aria-labelledby");
  });

  it("FAQ and blog filter patterns are keyboard-friendly", () => {
    const faq = read("components/landing/public/public-faq.tsx");
    const filter = read("components/blog/blog-category-filter.tsx");
    const homeFaq = read("app/landing-home.css");

    expect(faq).not.toContain("public-faq__divided-row + .public-faq__divided-row");
    expect(faq).toContain("<article");
    expect(faq).toContain("<details");
    expect(filter).toContain("aria-pressed");
    expect(filter).toContain('type="button"');
    expect(homeFaq).toContain(".home-faq__q:focus-visible");
  });

  it("scroll story limits live region and documents steps", () => {
    const flow = read("components/landing/home/how-flow/home-how-flow.tsx");
    const stage = read("components/landing/home/how-flow/how-flow-stage.tsx");
    const video = read("components/landing/home/landing-video-bg.tsx");

    expect(flow).toContain('aria-label="How ROAL works"');
    expect(flow).toContain("announceChanges={syncDesktopStage}");
    expect(flow).toContain("usePrefersMotion");
    expect(stage).toContain("announceChanges ? \"polite\" : undefined");
    expect(video).toContain("prefers-reduced-motion: reduce");
    expect(video).toContain("aria-hidden");
  });

  it("demo video placeholder exposes readable text without role=img", () => {
    const demo = read("components/landing/demo/demo-video-placeholder.tsx");
    expect(demo).not.toContain('role="img"');
    expect(demo).toContain("public-demo-video__placeholder-title");
  });

  it("auth header actions have focus-visible styles and readable CTA contrast", () => {
    const theme = read("app/public-theme.css");
    expect(theme).toContain(".public-auth-header__cta:focus-visible");
    expect(theme).toMatch(
      /\.public-theme \.public-auth-header__cta[\s\S]*?color:\s*#fff/
    );
  });

  it("demo preview timestamps stay SSR-stable", () => {
    const demo = read("lib/landing-demo-data.ts");
    const preview = read("components/landing/preview/phone-orders-preview.tsx");

    expect(demo).not.toMatch(/updated_at:\s*new Date\(/);
    expect(demo).not.toMatch(/created_at:\s*new Date\(/);
    expect(demo).toContain("2026-05-23T19:39:00.000Z");
    expect(preview).toContain('timeZone: "America/Chicago"');
  });

  it("dashboard theme styles keyboard focus for shell and main content", () => {
    const dash = read("app/dashboard-theme.css");
    const globals = read("app/globals.css");
    expect(globals).toContain("--focus-ring");
    expect(globals).toContain(":focus-visible");
    expect(dash).toContain(".app-shell-nav-link:focus-visible");
    expect(dash).toContain("#app-main-content a:focus-visible");
    expect(dash).toContain(".app-shell-menu-btn:focus-visible");
  });

  it("dashboard routes stay behind auth (not public a11y surface)", () => {
    for (const href of DASHBOARD_NAV_HREFS) {
      expect(href.startsWith("/dashboard")).toBe(true);
    }
    expect(existsSync(join(REPO, "app/(auth)/login/page.tsx"))).toBe(true);
    expect(existsSync(join(REPO, "app/(auth)/signup/page.tsx"))).toBe(true);
  });
});
