import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/callback/route";

function callbackRequest(search: string) {
  return new NextRequest(`http://localhost:3000/auth/callback${search}`);
}

describe("GET /auth/callback (legacy redirect)", () => {
  it("defaults to the dashboard", () => {
    const res = GET(callbackRequest(""));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("forwards a same-origin next, query included", () => {
    expect(GET(callbackRequest("?next=%2Fdashboard%2Frestaurants")).headers.get("location")).toBe(
      "http://localhost:3000/dashboard/restaurants"
    );
    expect(
      GET(callbackRequest(`?code=old&next=${encodeURIComponent("/dashboard/onboarding?step=2")}`)).headers.get("location")
    ).toBe("http://localhost:3000/dashboard/onboarding?step=2");
  });

  it.each(["//evil.example/phish", "https://evil.example", "/\\evil.example"])("blocks open redirect %s", (bad) => {
    const location = GET(callbackRequest(`?next=${encodeURIComponent(bad)}`)).headers.get("location") ?? "";
    expect(location).toBe("http://localhost:3000/dashboard");
    expect(location).not.toContain("evil");
  });

  it("does not set or clear any cookie", () => {
    const res = GET(callbackRequest("?code=abc&next=/dashboard"));
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
