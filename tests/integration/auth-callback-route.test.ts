import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchangeCodeForSession = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession },
  })),
}));

vi.mock("@/lib/env.public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  }),
}));

import { GET } from "@/app/auth/callback/route";

function callbackRequest(search: string) {
  return new NextRequest(`http://localhost:3000/auth/callback${search}`);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("redirects to login when code is missing", async () => {
    const res = await GET(callbackRequest(""));

    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("error=");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("blocks open-redirect next and lands on safe dashboard path", async () => {
    const res = await GET(
      callbackRequest("?code=oauth-code&next=//evil.example/phish")
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    const location = res.headers.get("location") ?? "";
    expect(location).toBe("http://localhost:3000/dashboard");
    expect(location).not.toContain("evil");
  });

  it("redirects to login when exchangeCodeForSession fails", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: "Invalid or expired code" },
    });

    const res = await GET(callbackRequest("?code=bad-code&next=/dashboard"));

    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(new URL(location).searchParams.get("error")).toBe(
      "Invalid or expired code"
    );
  });

  it("redirects to requested next on success", async () => {
    const res = await GET(
      callbackRequest("?code=good-code&next=/dashboard/restaurants")
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("good-code");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/dashboard/restaurants"
    );
  });
});
