import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DASHBOARD_NAV } from "@/lib/dashboard-nav";
import { sanitizeOpsErrorDetail } from "@/lib/admin/sanitize-ops-detail";
import { isOrgAdmin } from "@/lib/auth/roles";
import { hasOrgAdminAccess } from "@/lib/auth/context-server";
import type { AuthContext } from "@/lib/auth/types";

const REPO = join(import.meta.dirname, "../..");

describe("admin access gate", () => {
  it("allows owner and admin roles only", () => {
    expect(isOrgAdmin("owner")).toBe(true);
    expect(isOrgAdmin("admin")).toBe(true);
    expect(isOrgAdmin("member")).toBe(false);
  });

  it("hasOrgAdminAccess requires an admin membership", () => {
    const adminContext = {
      user: { id: "u1" },
      memberships: [
        {
          organization_id: "o1",
          role: "member",
          organization: { id: "o1", name: "A" },
        },
        {
          organization_id: "o2",
          role: "admin",
          organization: { id: "o2", name: "B" },
        },
      ],
      primaryMembership: null,
    } as unknown as AuthContext;

    const memberContext = {
      user: { id: "u2" },
      memberships: [
        {
          organization_id: "o1",
          role: "member",
          organization: { id: "o1", name: "A" },
        },
      ],
      primaryMembership: null,
    } as unknown as AuthContext;

    expect(hasOrgAdminAccess(adminContext)).toBe(true);
    expect(hasOrgAdminAccess(memberContext)).toBe(false);
  });
});

describe("dashboard nav adminOnly", () => {
  it("marks admin ops link as staff-only", () => {
    const adminItem = DASHBOARD_NAV.flatMap((g) => g.items).find(
      (i) => i.href === "/dashboard/admin"
    );
    expect(adminItem?.adminOnly).toBe(true);
  });
});

describe("sanitizeOpsErrorDetail", () => {
  it("redacts tokens and webhook URLs", () => {
    const out = sanitizeOpsErrorDetail(
      "Webhook failed https://hooks.example.com/secret sk-abcdefghijklmnopqrstuvwxyz"
    );
    expect(out).not.toContain("hooks.example.com");
    expect(out).not.toContain("sk-abcdefghijklmnopqrstuvwxyz");
    expect(out).toContain("[redacted");
  });
});

describe("admin page access gates", () => {
  it("redirects guests to login and members to dashboard", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/admin/page.tsx"),
      "utf8"
    );
    expect(page).toContain('redirect("/login?next=/dashboard/admin")');
    expect(page).toContain("hasOrgAdminAccess");
    expect(page).toContain('redirect("/dashboard")');
    expect(page).toContain("isOrgAdmin");
  });
});

describe("loadAdminOpsSnapshot", () => {
  it("sanitizes health before rendering admin HTML", () => {
    const src = readFileSync(
      join(REPO, "lib/admin/load-ops-snapshot.ts"),
      "utf8"
    );
    expect(src).toContain("sanitizeHealthReportForPublic");
  });

  it("getEnvStatus returns booleans not secret values", () => {
    const src = readFileSync(join(REPO, "lib/env.server.ts"), "utf8");
    const fn = src.slice(
      src.indexOf("export function getEnvStatus"),
      src.indexOf("export function collectMissingForFeature")
    );
    expect(fn).toContain("Boolean(env.");
    expect(fn).not.toMatch(/:\s*env\.(GEMINI|ELEVENLABS|STRIPE|SUPABASE_SERVICE)/);
  });
});
