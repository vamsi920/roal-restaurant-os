import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("form consistency (public theme)", () => {
  it("auth and contact forms share PublicFormField + panel tokens", () => {
    const auth = readFileSync(join(REPO, "components/auth/auth-form.tsx"), "utf8");
    const contact = readFileSync(
      join(REPO, "components/landing/contact/contact-pilot-form.tsx"),
      "utf8"
    );
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");

    expect(auth).toContain("PublicFormField");
    expect(auth).toContain("public-form-fields");
    expect(auth).toContain("public-form-error");

    expect(contact).toContain("PublicFormField");
    expect(contact).toContain("public-form-panel");
    expect(contact).toContain("public-form-error");
    expect(contact).not.toContain("text-[rgb(180");

    expect(theme).toContain(".public-form-field__input");
    expect(theme).toContain("rgb(var(--public-bg-elev))");
    expect(theme).toContain("[aria-invalid=\"true\"]");
    expect(theme).toContain(":focus-visible");
  });
});
