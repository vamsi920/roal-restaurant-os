import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("Dashboard rendered responsive QA (prompt 40)", () => {
  it("ships authenticated playwright sweep script", () => {
    const script = readFileSync(
      join(REPO, "scripts/qa-dashboard-responsive-sweep.mjs"),
      "utf8"
    );
    const pkg = readFileSync(join(REPO, "package.json"), "utf8");

    expect(pkg).toContain("qa:dashboard-responsive-sweep");
    expect(script).toContain("horizontal overflow");
    expect(script).toContain("FAKE_DATA_PATTERNS");
    expect(script).toContain("buildRoutes");
    expect(script).toContain("${base}/menu");
    expect(script).toContain("loginWithEnvCredentials");
    expect(script).not.toContain("console.log(email");
  });

  it("documents final rendered QA section in audit doc", () => {
    const audit = readFileSync(join(REPO, "docs/RESPONSIVE_UI_AUDIT.md"), "utf8");
    expect(audit).toContain("### Rendered QA —");
    expect(audit).toContain("Prompt 40");
  });
});
