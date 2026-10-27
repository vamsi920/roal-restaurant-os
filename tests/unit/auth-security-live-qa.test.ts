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
    const mw = readFileSync(join(REPO, "lib/auth/middleware-session.ts"), "utf8");
    expect(mw).toContain('pathname.startsWith("/dashboard")');
    expect(mw).toContain("isProtectedApi");
    expect(mw).toContain('status: 401');
    expect(mw).toContain("safeNextPath");
  });

  it("browser Firebase client uses public env only", () => {
    const client = readFileSync(join(REPO, "lib/firebase/client.ts"), "utf8");
    expect(client).toContain("NEXT_PUBLIC_FIREBASE_API_KEY");
    expect(client).not.toContain("env.server");
    expect(client).not.toContain("firebase-admin");
    expect(client).not.toContain("FIREBASE_SERVICE_ACCOUNT");
  });

  it("signout clears the session cookie", () => {
    const route = readFileSync(
      join(REPO, "app/auth/signout/route.ts"),
      "utf8"
    );
    expect(route).toContain("signOut");
    expect(route).toContain("/login");
  });

  it("public env schema excludes server secrets", () => {
    const pub = readFileSync(join(REPO, "lib/env.public.ts"), "utf8");
    expect(pub).toContain("NEXT_PUBLIC_FIREBASE_API_KEY");
    expect(pub).not.toContain("FIREBASE_SERVICE_ACCOUNT");
    expect(pub).toContain("Direct `process.env.NEXT_PUBLIC_*` refs");
    expect(pub).not.toContain("SERVICE_ROLE");
    expect(pub).not.toContain("GEMINI_API");
    expect(pub).not.toContain("OPENAI_API");
  });

  it("auth form only navigates to a safeNextPath destination", () => {
    const form = readFileSync(
      join(REPO, "components/auth/auth-form.tsx"),
      "utf8"
    );
    expect(form).toContain('safeNextPath(searchParams.get("next"), fallbackNext)');
    expect(form).toContain("window.location.assign(next)");
    expect(form).not.toContain("/auth/callback");
  });
});
