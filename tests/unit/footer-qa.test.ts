import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LANDING_FOOTER } from "@/lib/landing/footer-copy";

const REPO = join(import.meta.dirname, "../..");

describe("footer redesign (prompt 34)", () => {
  it("exposes essential links and legal routes only", () => {
    expect(LANDING_FOOTER.essentialLinks.map((l) => l.label)).toEqual([
      "Pricing",
      "Demo",
      "Privacy",
      "Terms",
    ]);
    expect(LANDING_FOOTER).not.toHaveProperty("columns");
    expect(LANDING_FOOTER).not.toHaveProperty("headline");
  });

  it("renders minimal brand, demo/contact, and link row", () => {
    const footer = readFileSync(
      join(REPO, "components/landing/public-footer.tsx"),
      "utf8"
    );
    expect(footer).toContain("public-footer__brand-name");
    expect(footer).toContain("public-footer__tagline");
    expect(footer).toContain("contactCta.href");
    expect(LANDING_FOOTER.contactCta.href).toBe("/contact");
    expect(footer).not.toContain("public-footer__headline");
    expect(footer).not.toContain("public-footer__cta--email");
    expect(footer).not.toContain("public-footer__grid");
    expect(footer).not.toContain("public-footer__col-title");
  });
});
