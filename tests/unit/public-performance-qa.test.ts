import { statSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_HERO_VIDEO } from "@/lib/landing/public-background";

const REPO = join(import.meta.dirname, "../..");

describe("public performance QA", () => {
  it("hero video stays within size budget and uses metadata preload", () => {
    const videoPath = join(REPO, "public", HOME_HERO_VIDEO.src.replace(/^\//, ""));
    expect(existsSync(videoPath)).toBe(true);

    const { size } = statSync(videoPath);
    expect(size).toBeLessThanOrEqual(HOME_HERO_VIDEO.maxBytes);

    const bg = readFileSync(
      join(REPO, "components/landing/home/landing-video-bg.tsx"),
      "utf8"
    );
    expect(bg).toContain("preload={HOME_HERO_VIDEO.preload}");
    expect(bg).not.toContain('preload="auto"');
    expect(HOME_HERO_VIDEO.preload).toBe("metadata");
  });

  it("homepage bundle does not import heavy story chapters or dashboard preview", () => {
    const landingPage = readFileSync(
      join(REPO, "components/landing/landing-page.tsx"),
      "utf8"
    );
    const shell = readFileSync(
      join(REPO, "components/landing/home/landing-home-shell.tsx"),
      "utf8"
    );

    for (const banned of [
      "chapters/",
      "preview/",
      "conversation-transcript",
      "getLandingPreview",
      "framer-motion",
    ]) {
      expect(landingPage).not.toContain(banned);
      expect(shell).not.toContain(banned);
    }
  });

  it("public reveals use CSS view timelines, not scroll listeners", () => {
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    expect(theme).toContain("animation-timeline: view()");
    expect(theme).not.toMatch(/addEventListener\(\s*["']scroll/);
  });

  it("how-flow batches intersection updates (no scroll handler loop)", () => {
    const howFlow = readFileSync(
      join(REPO, "components/landing/home/how-flow/home-how-flow.tsx"),
      "utf8"
    );
    expect(howFlow).toContain("IntersectionObserver");
    expect(howFlow).toContain("requestAnimationFrame");
    expect(howFlow).not.toMatch(/addEventListener\(\s*["']scroll/);
  });

  it("no preload=auto on public marketing video surfaces", () => {
    const files = [
      "components/landing/home/landing-video-bg.tsx",
      "components/landing/demo/demo-video-placeholder.tsx",
    ];
    for (const file of files) {
      const src = readFileSync(join(REPO, file), "utf8");
      expect(src).not.toContain('preload="auto"');
      expect(src).not.toContain("preload='auto'");
    }
  });
});
