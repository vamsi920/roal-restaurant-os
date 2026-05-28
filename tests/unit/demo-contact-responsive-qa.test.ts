import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("demo and contact responsive (prompt 13)", () => {
  it("clips demo and contact page overflow", () => {
    expect(read("app/demo/page.tsx")).toContain("overflow-x-clip");
    expect(read("components/landing/demo/demo-page-content.tsx")).toContain("overflow-x-clip");
    expect(read("components/landing/contact/contact-page-content.tsx")).toContain(
      "overflow-x-clip"
    );
  });

  it("styles demo video placeholder and proof stack on small viewports", () => {
    const demoCss = read("app/demo-page.css");
    expect(demoCss).toContain("Demo page responsive (prompt 13)");
    expect(demoCss).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-demo-video__aspect[\s\S]*min-height/
    );
    expect(demoCss).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-demo-proof__grid[\s\S]*grid-template-columns:\s*1fr/
    );
    expect(demoCss).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-demo-cta-actions[\s\S]*flex-direction:\s*column/
    );
  });

  it("keeps contact form, status, and CTAs usable on phone", () => {
    const form = read("components/landing/contact/contact-pilot-form.tsx");
    const contactCss = read("app/contact-page.css");

    expect(form).toContain('role="alert"');
    expect(form).toContain('role="status"');
    expect(form).toContain("aria-live");
    expect(contactCss).toContain("Contact page responsive (prompt 13)");
    expect(contactCss).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-contact-field__input[\s\S]*min-height:\s*2\.75rem/
    );
    expect(contactCss).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-contact-cta-actions[\s\S]*flex-direction:\s*column/
    );
  });

  it("labels demo proof as illustrative when not live", () => {
    const proof = read("components/landing/demo/demo-proof-section.tsx");
    expect(proof).toContain("proof.ticketNote");
    expect(proof).toContain('preview.source === "live"');
  });
});
