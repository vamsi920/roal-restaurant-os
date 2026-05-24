import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("desktop page layout QA", () => {
  it("desktop stylesheet wired with readable tokens", () => {
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    const desktop = readFileSync(join(REPO, "app/public-desktop-pages.css"), "utf8");

    expect(theme).toContain('@import "./public-desktop-pages.css"');
    expect(theme).toContain("--public-readable-max");
    expect(desktop).toContain("@media (min-width: 900px)");
    expect(desktop).toContain("launch-aeo-answer:only-child");
    expect(desktop).toContain("public-demo-video__frame");
  });

  it("demo/contact sections avoid double vertical padding", () => {
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    expect(theme).toMatch(
      /\.public-demo-page__section\s*\{[^}]*padding-block:\s*0/
    );
    expect(theme).toMatch(
      /\.public-contact-page__section\s*\{[^}]*padding-block:\s*0/
    );
  });
});
