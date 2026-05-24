import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

function read(rel: string) {
  return readFileSync(join(REPO, rel), "utf8");
}

function countLandingSections(source: string) {
  return (source.match(/<LandingSection/g) ?? []).length;
}

describe("visual consistency public pages (prompt 37)", () => {
  it("about page drops AEO band and generic value cards", () => {
    const about = read("components/landing/about/about-page-content.tsx");
    expect(about).not.toContain("AboutAeoAnswer");
    expect(about).not.toContain("AboutValues");
    expect(about).not.toContain("glass-card");
    expect(countLandingSections(about)).toBeLessThanOrEqual(3);
  });

  it("security page drops roadmap section and pillar glass-card grid", () => {
    const security = read("components/landing/security/security-page-content.tsx");
    expect(security).not.toContain("SECURITY_ROADMAP");
    expect(security).not.toContain("public-security-pillar");
    expect(security).not.toContain("glass-card");
    expect(countLandingSections(security)).toBeLessThanOrEqual(3);
  });

  it("contact page inlines fit list and drops fit section", () => {
    const contact = read("components/landing/contact/contact-page-content.tsx");
    expect(contact).toContain("public-contact-fit__list");
    expect(contact).not.toMatch(/fit\.titleId/);
    expect(countLandingSections(contact)).toBe(1);
  });
});
