import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const AUDIT = join(import.meta.dirname, "../../docs/RESPONSIVE_UI_AUDIT.md");

describe("responsive audit checklist (prompt 04)", () => {
  const doc = readFileSync(AUDIT, "utf8");

  it("defines required viewport sizes for rendered QA", () => {
    expect(doc).toContain("## Responsive QA checklist (Prompt 04)");
    expect(doc).toContain("320 × 700");
    expect(doc).toContain("390 × 844");
    expect(doc).toContain("768 × 1024");
    expect(doc).toContain("1024 × 768");
    expect(doc).toContain("1440 × 900");
  });

  it("lists public and authenticated pages to inspect", () => {
    expect(doc).toContain("### Pages to inspect");
    expect(doc).toContain("| `/` |");
    expect(doc).toContain("/dashboard/restaurants/[id]");
    expect(doc).toContain("/login");
    expect(doc).toContain("real tenant data only");
  });

  it("defines interactions and pass/fail criteria", () => {
    expect(doc).toContain("### Interactions to test");
    expect(doc).toContain("### Pass/fail criteria");
    expect(doc).toContain("Real data");
    expect(doc).toContain("prefers-reduced-motion");
    expect(doc).toContain("Rendered QA —");
  });
});
