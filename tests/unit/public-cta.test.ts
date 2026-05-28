import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { mailtoUsesPilotInbox } from "@/lib/landing/contact-mailto";
import { HOME_CTA_BAND } from "@/lib/landing/home-cta-band-copy";
import { HOME_CTA } from "@/lib/landing/home-theme";
import {
  PUBLIC_CTA,
  PUBLIC_CTA_LABELS,
  PUBLIC_CTA_PAIR,
} from "@/lib/landing/public-cta";

const REPO = join(import.meta.dirname, "../..");

const MARKETING_DIRS = [
  "components/landing",
  "components/blog",
  "app/about",
  "app/pricing",
  "app/demo",
  "app/contact",
  "app/security",
  "app/privacy",
  "app/terms",
  "app/blog",
  "app/page.tsx",
  "app/not-found.tsx",
] as const;

const BANNED_CTA_LABELS = ["Book a pilot", "Request pilot"] as const;

function walkTs(dir: string): string[] {
  const abs = join(REPO, dir);
  let ents: ReturnType<typeof readdirSync>;
  try {
    ents = readdirSync(abs, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const ent of ents) {
    const rel = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkTs(rel));
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(rel);
  }
  return out;
}

describe("public CTA canon", () => {
  it("default pair is hear demo + book demo", () => {
    expect(PUBLIC_CTA_PAIR.primary).toEqual(PUBLIC_CTA.hearDemo);
    expect(PUBLIC_CTA_PAIR.secondary).toEqual(PUBLIC_CTA.bookDemo);
  });

  it("marketing copy avoids retired pilot labels", () => {
    const violations: { file: string; hit: string }[] = [];
    const files = [...new Set(MARKETING_DIRS.flatMap((d) => walkTs(d)))];
    for (const file of files) {
      const content = readFileSync(join(REPO, file), "utf8");
      for (const hit of BANNED_CTA_LABELS) {
        if (content.includes(hit)) violations.push({ file: relative(REPO, file), hit });
      }
    }
    expect(violations).toEqual([]);
  });

  it("marketing TSX uses public button classes for links", () => {
    const violations: { file: string; hit: string }[] = [];
    const files = [...new Set(MARKETING_DIRS.flatMap((d) => walkTs(d)))];
    for (const file of files) {
      const content = readFileSync(join(REPO, file), "utf8");
      if (/(?<!public-)btn-primary\b/.test(content)) {
        violations.push({ file: relative(REPO, file), hit: "btn-primary" });
      }
      if (/(?<!public-)btn-ghost\b/.test(content)) {
        violations.push({ file: relative(REPO, file), hit: "btn-ghost" });
      }
    }
    expect(violations).toEqual([]);
  });

  it("labels stay stable", () => {
    expect(PUBLIC_CTA_LABELS.hearDemo).toBe("Hear a demo call");
    expect(PUBLIC_CTA_LABELS.bookDemo).toBe("Book a demo");
  });

  it("home hero CTAs use hear demo + book demo mailto", () => {
    expect(HOME_CTA.primary).toEqual(PUBLIC_CTA.hearDemo);
    expect(HOME_CTA.secondary.label).toBe(PUBLIC_CTA_LABELS.bookDemo);
    expect(mailtoUsesPilotInbox(HOME_CTA.secondary.href)).toBe(true);
    expect(HOME_CTA.secondary.href).toContain("hello@getroal.com");
  });

  it("public buttons use shared height tokens and calm motion (prompt 55)", () => {
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    const btn = readFileSync(
      join(REPO, "components/landing/public/public-cta-button.tsx"),
      "utf8"
    );

    expect(theme).toContain("--public-btn-height: 3rem");
    expect(theme).toContain(".public-btn-primary:active");
    expect(theme).toContain("0 1px 2px rgb(var(--public-ink) / 0.08)");
    expect(theme).not.toContain("0 8px 24px rgb(var(--public-ink) / 0.2)");
    expect(btn).toContain("public-btn-label");
    expect(btn).toContain("showArrow ?? true");
  });

  it("home final CTA includes supporting line and demo buttons", () => {
    expect(HOME_CTA_BAND.title).toBe("Ready to try it on your line?");
    expect(HOME_CTA_BAND.description.length).toBeGreaterThan(20);
    expect(HOME_CTA_BAND.primary).toEqual(PUBLIC_CTA.hearDemo);
    expect(HOME_CTA_BAND.secondary.label).toBe(PUBLIC_CTA_LABELS.bookDemo);

    const section = readFileSync(
      join(REPO, "components/landing/home/sections/home-cta-band.tsx"),
      "utf8"
    );
    expect(section).toContain("description={description}");
  });
});
