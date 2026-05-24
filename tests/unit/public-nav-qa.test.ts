import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_NAV_LINKS,
  PUBLIC_NAV_LOGIN,
  PUBLIC_NAV_SIGNUP,
} from "@/lib/landing/public-nav";

const REPO = join(import.meta.dirname, "../..");

describe("public nav QA (prompt 36)", () => {
  it("primary links are minimal launch IA", () => {
    expect(PUBLIC_NAV_LINKS.map((l) => l.label)).toEqual([
      "Pricing",
      "Blog",
      "Demo",
      "About",
    ]);
    expect(PUBLIC_NAV_LINKS.map((l) => l.href)).toEqual([
      "/pricing",
      "/blog",
      "/demo",
      "/about",
    ]);
    const labels = PUBLIC_NAV_LINKS.map((l) => l.label).join(" ");
    expect(labels).not.toContain("How it works");
    expect(labels).not.toContain("Contact");
    expect(labels).not.toContain("Security");
  });

  it("header actions are Login + Sign up (not Book a demo)", () => {
    expect(PUBLIC_NAV_LOGIN).toEqual({ href: "/login", label: "Login" });
    expect(PUBLIC_NAV_SIGNUP.href).toBe("/signup");
    expect(PUBLIC_NAV_SIGNUP.label).toBe("Sign up");

    const marketing = readFileSync(
      join(REPO, "components/landing/public/public-marketing-nav.tsx"),
      "utf8"
    );
    expect(marketing).toContain("PUBLIC_NAV_SIGNUP");
    expect(marketing).not.toContain("PUBLIC_NAV_BOOK_DEMO");
    expect(marketing).toContain("public-nav-drawer");
  });

  it("auth header reuses shared nav links and mobile drawer actions", () => {
    const auth = readFileSync(
      join(REPO, "components/auth/public-auth-header.tsx"),
      "utf8"
    );
    expect(auth).toContain("PUBLIC_NAV_LINKS");
    expect(auth).toContain("PUBLIC_NAV_SIGNUP");
    expect(auth).toContain('role="dialog"');
    expect(auth).toContain("public-nav-drawer__cta");
  });
});
