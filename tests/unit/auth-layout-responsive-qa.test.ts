import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("auth layout responsive (prompt 17)", () => {
  it("loads auth-page.css after public-theme so layout rules win", () => {
    const layout = read("app/(auth)/layout.tsx");
    const themeIdx = layout.indexOf("public-theme.css");
    const authIdx = layout.indexOf("auth-page.css");
    expect(themeIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeGreaterThan(themeIdx);
  });

  it("hides value aside on phone and uses split grid from tablet up", () => {
    const css = read("app/auth-page.css");
    expect(css).toContain("Auth layout comfort (prompt 17)");
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-signup-entry__aside[\s\S]*display:\s*none/
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-signup-entry__form[\s\S]*width:\s*100%/
    );
    expect(css).toMatch(
      /@media \(min-width: 768px\)[\s\S]*\.public-signup-entry__grid[\s\S]*grid-template-columns/
    );
  });

  it("keeps full-width form shell classes on login and signup entries", () => {
    const login = read("components/auth/login-page-entry.tsx");
    const signup = read("components/auth/signup-page-entry.tsx");
    expect(login).toContain("public-signup-entry__grid w-full");
    expect(signup).toContain("public-signup-entry__form w-full");
    expect(login).toContain("public-signup-entry__aside");
  });

  it("does not change Supabase calls in AuthForm", () => {
    const form = read("components/auth/auth-form.tsx");
    expect(form).toContain("signInWithPassword");
    expect(form).toContain("signUp");
    expect(form).toContain("resetPasswordForEmail");
  });
});
