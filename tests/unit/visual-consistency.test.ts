import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

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
] as const;

const LEGACY_CLASS_FRAGMENTS = [
  "landing-beat-card--cream",
  "landing-beat-card--yellow",
  "landing-beat-card--lime",
  "landing-panel--cream",
  "landing-panel--lime",
  "from-accent/12",
  "bg-blue-",
  "text-blue-",
] as const;

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

describe("visual consistency (public marketing)", () => {
  it("dashboard globals use ROAL ink and lavender accent", () => {
    const globals = readFileSync(join(REPO, "app/globals.css"), "utf8");
    expect(globals).toContain("--accent: 100 85 175");
    expect(globals).not.toContain("--accent: 8 145 178");
    expect(globals).toContain("--text-primary: 22 22 24");
  });

  it("public washes avoid amber gradient token", () => {
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    expect(theme).not.toContain("--public-accent-amber");
    expect(theme).toContain("--public-accent-violet");
  });
  it("marketing TSX avoids legacy cream/yellow/blue class names", () => {
    const violations: { file: string; hit: string }[] = [];
    const files = [...new Set(MARKETING_DIRS.flatMap((d) => walkTs(d)))];
    for (const file of files) {
      const content = readFileSync(join(REPO, file), "utf8");
      for (const hit of LEGACY_CLASS_FRAGMENTS) {
        if (content.includes(hit)) violations.push({ file: relative(REPO, file), hit });
      }
    }
    expect(violations).toEqual([]);
  });
});
