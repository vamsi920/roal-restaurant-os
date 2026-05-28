import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("home hero video layer (responsive UI prompt 07)", () => {
  it("uses luminous gradient fallback without mp4", () => {
    const css = read("app/landing-home.css");
    expect(css).toMatch(
      /\.home-video-layer:not\(\.home-video-layer--has-video\)[\s\S]*--public-bg-wash-hero/
    );
    expect(css).toMatch(
      /\.home-video-layer:not\(\.home-video-layer--has-video\)[\s\S]*opacity:\s*1/
    );
  });

  it("tunes video opacity and hero-readable wash per breakpoint", () => {
    const css = read("app/landing-home.css");
    expect(css).toContain(".home-video-layer--has-video .home-video-layer__video");
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.home-video-layer--has-video \.home-video-layer__video[\s\S]*object-position:\s*center 42%/
    );
    expect(css).toMatch(
      /@media \(min-width: 768px\) and \(max-width: 1023px\)[\s\S]*\.home-video-layer--has-video \.home-video-layer__video/
    );
    expect(css).toMatch(
      /@media \(min-width: 1024px\)[\s\S]*\.home-video-layer--has-video \.home-video-layer__video/
    );
    expect(css).toMatch(
      /\.home-video-layer--has-video \.home-video-layer__wash[\s\S]*linear-gradient/
    );
  });

  it("reduced-motion keeps a full gradient canvas (no blank hero)", () => {
    const css = read("app/landing-home.css");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.home-video-layer__video[\s\S]*display:\s*none/
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.home-video-layer \.home-video-layer__blobs[\s\S]*--public-bg-wash-hero/
    );
  });

  it("video component respects reduced motion, save-data, errors, and tab visibility", () => {
    const bg = read("components/landing/home/landing-video-bg.tsx");
    expect(bg).toContain("prefers-reduced-motion: reduce");
    expect(bg).toContain("saveData");
    expect(bg).toContain('addEventListener("error"');
    expect(bg).toContain("visibilitychange");
    expect(bg).toContain('data-public-hero-bg={hasVideo ? "video" : "gradient"}');
    expect(bg).toContain("preload={HOME_HERO_VIDEO.preload}");
  });
});
