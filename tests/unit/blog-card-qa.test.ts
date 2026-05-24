import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("blog card design", () => {
  it("uses unified glass editorial card surface", () => {
    const card = readFileSync(join(REPO, "components/blog/blog-card.tsx"), "utf8");
    expect(card).toContain("blog-card__surface");
    expect(card).not.toContain("glass-card");
    expect(card).toContain("blog-card__link");
    expect(card).not.toContain("public-blog-card");
    expect(card).not.toContain("landing-panel");
    expect(card).not.toContain("ticket");
  });

  it("blog theme avoids poster yellow and offset shadows on cards", () => {
    const css = readFileSync(join(REPO, "app/blog-theme.css"), "utf8");
    const cardBlock = css.slice(css.indexOf("/* — Cards"));
    expect(cardBlock).toContain(".blog-card__surface");
    expect(cardBlock).not.toContain("landing-yellow");
    expect(cardBlock).not.toContain("5px 5px");
    expect(cardBlock).not.toContain("public-blog-card");
  });
});
