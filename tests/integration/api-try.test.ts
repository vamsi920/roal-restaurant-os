import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/try/route";
import { EnvValidationError } from "@/lib/env.shared";
import type { TrialRecord } from "@/lib/trial/types";

vi.mock("@/lib/trial/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/trial/store")>();
  return { ...actual, insertTrial: vi.fn() };
});

import { insertTrial, TrialStoreUnavailableError } from "@/lib/trial/store";

const TRIAL_ID = "22222222-2222-4222-8222-222222222222";

function trialRecord(overrides: Partial<TrialRecord> = {}): TrialRecord {
  return {
    id: TRIAL_ID,
    status: "resolving",
    source_kind: "website",
    source_input: "https://joespizza.com/",
    step_log: [],
    restaurant_name: null,
    profile: null,
    weekly_hours: null,
    menu: null,
    menu_source: null,
    menu_source_url: null,
    knowledge: [],
    persona: {},
    prompt: null,
    greeting: null,
    place_id: null,
    transcript: null,
    scorecard: {},
    call_count: 0,
    claimed_restaurant_id: null,
    claimed_organization_id: null,
    claimed_at: null,
    error: null,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    expires_at: "2026-10-08T00:00:00.000Z",
    ...overrides,
  };
}

let ipCounter = 0;
/** Each test gets its own client IP so the module-level rate limiter does not leak between tests. */
function post(body: unknown, ip?: string) {
  const clientIp = ip ?? `10.0.0.${(ipCounter += 1)}`;
  return POST(
    new Request("http://localhost/api/try", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": clientIp },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

describe("POST /api/try", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing or garbage input without touching the store", async () => {
    const res = await post({ input: "" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/website or google maps link/i);

    const res2 = await post({ input: "x" });
    expect(res2.status).toBe(400);

    const res3 = await post("not json at all");
    expect(res3.status).toBe(400);

    expect(insertTrial).not.toHaveBeenCalled();
  });

  it("creates a trial, returns the public view and sets the signed cookie", async () => {
    vi.mocked(insertTrial).mockImplementation(async (input) =>
      trialRecord({ source_input: input.sourceInput, source_kind: input.sourceKind })
    );

    const res = await post({ input: "joespizza.com" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trial).toMatchObject({
      id: TRIAL_ID,
      status: "resolving",
      sourceKind: "website",
      sourceInput: "https://joespizza.com/",
      // Nothing is known about the restaurant yet, so the default voice names the host.
      persona: { agentName: "Sarah" },
    });
    expect(body.trial).not.toHaveProperty("prompt");
    expect(body.trial).not.toHaveProperty("token_hash");

    const call = vi.mocked(insertTrial).mock.calls[0][0];
    expect(call).toMatchObject({ sourceInput: "https://joespizza.com/", sourceKind: "website" });
    expect(call.tokenHash).toMatch(/^[0-9a-f]{64}$/);

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(new RegExp(`^roal_trial=${TRIAL_ID}\\.[A-Za-z0-9_-]+;`));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toContain(call.tokenHash);
  });

  it("joins name and city for name_city input", async () => {
    vi.mocked(insertTrial).mockResolvedValue(trialRecord({ source_kind: "name_city", source_input: "Joe's Pizza, Austin" }));
    const res = await post({ input: "Joe's Pizza, Austin" });
    expect(res.status).toBe(200);
    expect(vi.mocked(insertTrial).mock.calls[0][0]).toMatchObject({
      sourceInput: "Joe's Pizza, Austin",
      sourceKind: "name_city",
    });
  });

  it("returns 503 when the trial store is unavailable", async () => {
    vi.mocked(insertTrial).mockRejectedValue(new TrialStoreUnavailableError());
    const res = await post({ input: "https://joespizza.com" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/not configured/i);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("returns 503 on env validation errors", async () => {
    vi.mocked(insertTrial).mockRejectedValue(new EnvValidationError([{ path: "FIREBASE_SERVICE_ACCOUNT", message: "missing" }]));
    const res = await post({ input: "https://joespizza.com" });
    expect(res.status).toBe(503);
  });

  it("returns a generic 500 for unexpected store errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(insertTrial).mockRejectedValue(new Error("db exploded with secret=abc"));
    const res = await post({ input: "https://joespizza.com" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Could not start. Try again.");
    expect(JSON.stringify(body)).not.toContain("secret=abc");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns 429 after 8 attempts from the same IP within the window", async () => {
    vi.mocked(insertTrial).mockResolvedValue(trialRecord());
    const ip = "203.0.113.77";
    for (let i = 0; i < 8; i += 1) {
      const res = await post({ input: "https://joespizza.com" }, ip);
      expect(res.status).toBe(200);
    }
    const blocked = await post({ input: "https://joespizza.com" }, ip);
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toMatch(/too many attempts/i);
    expect(insertTrial).toHaveBeenCalledTimes(8);

    // A different IP is not affected.
    const other = await post({ input: "https://joespizza.com" }, "203.0.113.78");
    expect(other.status).toBe(200);
  });
});
