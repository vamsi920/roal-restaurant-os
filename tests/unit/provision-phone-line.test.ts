import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryDb } from "@/lib/db";
import { resetServerEnvCache } from "@/lib/env.server";
import { areaCodeOf, provisionRestaurantPhoneLine } from "@/lib/telephony/provision-phone-line";

async function restaurant(profile: Record<string, unknown>) {
  const db = createMemoryDb();
  const slug = `org-${Math.random().toString(36).slice(2, 9)}`;
  const { data: org } = await db.from("organizations").insert({ name: "Joe's", slug }).select("id").single();
  const { data: r } = await db
    .from("restaurants")
    .insert({ name: "Joe's Pizza", organization_id: org!.id })
    .select("id")
    .single();
  await db.from("restaurant_profiles").update(profile).eq("restaurant_id", r!.id);
  return { db, id: r!.id as string };
}

function twilioFetch(available: string[]) {
  const calls: string[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("/AvailablePhoneNumbers/")) {
      const local = url.includes("AreaCode=") ? available : ["+15559990000"];
      return new Response(JSON.stringify({ available_phone_numbers: local.map((phone_number) => ({ phone_number })) }), { status: 200 });
    }
    return new Response(JSON.stringify({ sid: "PN123", phone_number: "+15125550100" }), { status: 201 });
  });
  return { fn, calls };
}

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvCache();
});

describe("areaCodeOf", () => {
  it("reads US area codes", () => {
    expect(areaCodeOf("(512) 555-0199")).toBe("512");
    expect(areaCodeOf("+1 212 555 0100")).toBe("212");
    expect(areaCodeOf("555")).toBeNull();
  });
});

describe("provisionRestaurantPhoneLine", () => {
  it("buys a local number near the restaurant, connects it to the host and saves it", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
    resetServerEnvCache();
    const { db, id } = await restaurant({ phone: "(512) 555-0199", elevenlabs_agent_id: "agent_joe" });
    const { fn, calls } = twilioFetch(["+15125550100"]);
    const importNumber = vi.fn(async () => ({ phone_number_id: "phnum_1" }));
    const assignNumber = vi.fn(async () => ({}));

    const out = await provisionRestaurantPhoneLine(db, id, { fetchImpl: fn as never, importNumber, assignNumber });

    expect(out).toEqual({ ok: true, phoneNumber: "+15125550100", alreadyHad: false });
    expect(calls[0]).toContain("AreaCode=512");
    expect(calls[1]).toMatch(/^POST .*IncomingPhoneNumbers\.json$/);
    expect(assignNumber).toHaveBeenCalledWith("phnum_1", "agent_joe");
    const { data } = await db.from("restaurant_profiles").select("roal_phone_number, roal_phone_number_id").eq("restaurant_id", id).single();
    expect(data).toMatchObject({ roal_phone_number: "+15125550100", roal_phone_number_id: "phnum_1" });
  });

  it("never buys a second number", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
    resetServerEnvCache();
    const { db, id } = await restaurant({ elevenlabs_agent_id: "agent_joe", roal_phone_number: "+15125550100" });
    const { fn } = twilioFetch([]);
    const out = await provisionRestaurantPhoneLine(db, id, { fetchImpl: fn as never });
    expect(out).toEqual({ ok: true, phoneNumber: "+15125550100", alreadyHad: true });
    expect(fn).not.toHaveBeenCalled();
  });

  it("waits for the host before buying", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
    resetServerEnvCache();
    const { db, id } = await restaurant({ phone: "5125550199" });
    const { fn } = twilioFetch(["+15125550100"]);
    const out = await provisionRestaurantPhoneLine(db, id, { fetchImpl: fn as never });
    expect(out).toMatchObject({ ok: false, reason: "host_not_ready" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("does nothing without Twilio keys", async () => {
    const { db, id } = await restaurant({ elevenlabs_agent_id: "agent_joe" });
    const out = await provisionRestaurantPhoneLine(db, id);
    expect(out).toMatchObject({ ok: false, reason: "not_configured" });
  });
});
