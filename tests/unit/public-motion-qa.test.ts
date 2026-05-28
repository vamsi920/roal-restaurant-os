import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_MOTION } from "@/lib/landing/public-motion";

const REPO = join(import.meta.dirname, "../..");

describe("public motion polish (prompt 36)", () => {
  it("exports motion tokens aligned with CSS variables", () => {
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    expect(PUBLIC_MOTION.revealOffsetPx).toBe(10);
    expect(PUBLIC_MOTION.revealDurationMs).toBe(480);
    expect(theme).toContain("--public-motion-reveal-offset: 10px");
    expect(theme).toContain("--public-motion-reveal-duration: 0.48s");
    expect(theme).toContain("--public-motion-hover-lift: -1px");
  });

  it("uses view-timeline reveals and hover-gated lifts", () => {
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    expect(theme).toContain("animation-timeline: view()");
    expect(theme).toContain("@keyframes public-reveal-in");
    expect(theme).toMatch(/@media \(hover: hover\) and \(pointer: fine\)/);
    expect(theme).toContain("prefers-reduced-motion: reduce");
    expect(theme).toContain("animation: none !important");
  });

  it("home story sections use scroll reveals without scroll listeners", () => {
    const how = readFileSync(
      join(REPO, "components/landing/home/how-flow/home-how-flow.tsx"),
      "utf8"
    );
    const pay = readFileSync(
      join(REPO, "components/landing/home/sections/home-pay.tsx"),
      "utf8"
    );
    const faq = readFileSync(join(REPO, "components/landing/public/public-faq.tsx"), "utf8");
    const metrics = readFileSync(
      join(REPO, "components/landing/public/public-metrics-strip.tsx"),
      "utf8"
    );

    expect(how).toContain('className="home-wrap public-reveal"');
    expect(pay).toContain("public-reveal");
    expect(faq).toContain("public-reveal-stagger");
    expect(faq).toContain("public-reveal-item");
    expect(metrics).toContain('className="public-reveal"');
    expect(how).not.toMatch(/addEventListener\(\s*["']scroll/);
  });

  it("how-flow respects reduced motion via matchMedia", () => {
    const how = readFileSync(
      join(REPO, "components/landing/home/how-flow/home-how-flow.tsx"),
      "utf8"
    );
    expect(how).toContain('prefers-reduced-motion: reduce');
    expect(how).toContain("home-how-flow--static");
  });
});
