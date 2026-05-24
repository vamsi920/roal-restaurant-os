import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("auth security posture (launch 26)", () => {
  it("callback uses safeNextPath", () => {
    const route = readFileSync(
      join(REPO, "app/auth/callback/route.ts"),
      "utf8"
    );
    expect(route).toContain('safeNextPath(searchParams.get("next"))');
  });

  it("middleware gates dashboard and protected APIs", () => {
    const mw = readFileSync(join(REPO, "lib/supabase/middleware.ts"), "utf8");
    expect(mw).toContain('pathname.startsWith("/dashboard")');
    expect(mw).toContain("isProtectedApi");
    expect(mw).toContain('status: 401');
    expect(mw).toContain("safeNextPath");
  });

  it("browser supabase client uses public env only", () => {
    const client = readFileSync(join(REPO, "lib/supabase/client.ts"), "utf8");
    expect(client).toContain("getPublicEnv");
    expect(client).not.toContain("env.server");
    expect(client).not.toContain("SERVICE_ROLE");
  });

  it("signout clears session via supabase auth", () => {
    const route = readFileSync(
      join(REPO, "app/auth/signout/route.ts"),
      "utf8"
    );
    expect(route).toContain("signOut");
    expect(route).toContain("/login");
  });

  it("public env schema excludes server secrets", () => {
    const pub = readFileSync(join(REPO, "lib/env.public.ts"), "utf8");
    expect(pub).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(pub).toContain("Direct `process.env.NEXT_PUBLIC_*` refs");
    expect(pub).not.toContain("SERVICE_ROLE");
    expect(pub).not.toContain("GEMINI_API");
  });

  it("auth form uses callback with encoded next", () => {
    const form = readFileSync(
      join(REPO, "components/auth/auth-form.tsx"),
      "utf8"
    );
    expect(form).toContain("/auth/callback");
    expect(form).toContain("encodeURIComponent(next)");
  });
});
