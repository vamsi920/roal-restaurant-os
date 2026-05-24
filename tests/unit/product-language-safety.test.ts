import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_HERO } from "@/lib/landing/home-theme";
import {
  BANNED_PRODUCT_CLAIMS,
  PRODUCT_LANGUAGE_NEGATION_PREFIXES,
} from "@/lib/landing/product-language-safety";

const REPO_ROOT = join(import.meta.dirname, "../..");

const SCAN_DIRS = [
  "lib/landing",
  "lib/blog/posts",
  "components/landing",
  "components/blog",
] as const;

const SCAN_FILES = ["lib/blog/posts.ts", "lib/blog/index-copy.ts"] as const;

const SKIP_FILES = new Set(["lib/landing/product-language-safety.ts"]);

function walkTs(dir: string): string[] {
  const abs = join(REPO_ROOT, dir);
  const out: string[] = [];
  for (const ent of readdirSync(abs, { withFileTypes: true })) {
    const p = join(abs, ent.name);
    if (ent.isDirectory()) out.push(...walkTs(join(dir, ent.name)));
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(relative(REPO_ROOT, p));
  }
  return out;
}

function isNegated(text: string, index: number): boolean {
  const window = text.slice(Math.max(0, index - 56), index).toLowerCase();
  if (PRODUCT_LANGUAGE_NEGATION_PREFIXES.some((p) => window.endsWith(p))) return true;
  if (/\b(?:do\s+)?not\s+publish\s/.test(window)) return true;
  return false;
}

function bannedHits(content: string): string[] {
  const lower = content.toLowerCase();
  const hits = new Set<string>();
  for (const banned of BANNED_PRODUCT_CLAIMS) {
    let start = 0;
    while (true) {
      const idx = lower.indexOf(banned, start);
      if (idx === -1) break;
      if (!isNegated(lower, idx)) hits.add(banned);
      start = idx + banned.length;
    }
  }
  return [...hits];
}

function allScanPaths(): string[] {
  const fromDirs = SCAN_DIRS.flatMap((d) => walkTs(d));
  const files = [...fromDirs, ...SCAN_FILES.filter((f) => statSync(join(REPO_ROOT, f)).isFile())];
  return [...new Set(files)].filter((f) => !SKIP_FILES.has(f));
}

describe("product language safety", () => {
  it("marketing copy avoids banned absolute claims", () => {
    const violations: { file: string; hits: string[] }[] = [];
    for (const file of allScanPaths()) {
      const content = readFileSync(join(REPO_ROOT, file), "utf8");
      const hits = bannedHits(content);
      if (hits.length) violations.push({ file, hits });
    }
    expect(violations).toEqual([]);
  });

  it("home hero lead stays short and names the kitchen", () => {
    const words = HOME_HERO.lead.trim().split(/\s+/);
    expect(words.length).toBeLessThanOrEqual(22);
    expect(HOME_HERO.lead.toLowerCase()).toContain("kitchen");
  });
});
