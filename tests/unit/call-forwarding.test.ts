import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryDb, type Db } from "@/lib/db";
import { resetMemoryStore } from "@/lib/db/store";
import { dialableDigits, forwardingInstructions } from "@/lib/forwarding/carriers";
import { runForwardingDailyCheck } from "@/lib/forwarding/daily-check";
import { loadForwardingRow, saveForwardingRow } from "@/lib/forwarding/state";
import { checkForwardingTest, detectLiveForwardedCalls, startForwardingTest } from "@/lib/forwarding/twilio-check";

const RID = "rest_1";
const ROAL = "+14175551234";
const STORE = "(201) 744-4665";
const cfg = { sid: "AC1", token: "t" };

type TwilioCallStub = { sid: string; from: string; to: string; direction: string; status: string; forwarded_from: string | null; date_created: string };

function fakeTwilio(state: { inbound: TwilioCallStub[]; outbound: Record<string, unknown> }) {
  const posts: Array<{ path: string; form: URLSearchParams }> = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    const path = u.pathname.replace("/2010-04-01/Accounts/AC1", "");
    if (init?.method === "POST") {
      posts.push({ path, form: new URLSearchParams(String(init.body)) });
      return new Response(JSON.stringify({ sid: "CA_OUT" }), { status: 201 });
    }
    if (path === "/Calls.json") return new Response(JSON.stringify({ calls: state.inbound }));
    return new Response(JSON.stringify(state.outbound));
  });
  return { fetchImpl: fn as unknown as typeof fetch, posts };
}

async function seed(db: Db) {
  await db.from("restaurants").insert({ id: RID, name: "Eggmania", organization_id: "org_1" });
  await db.from("restaurant_profiles").upsert({ restaurant_id: RID, organization_id: "org_1", phone: STORE, roal_phone_number: ROAL, timezone: "America/New_York" }, { onConflict: "restaurant_id" });
}

describe("forwarding instructions", () => {
  it("fills our number into the carrier code for each mode", () => {
    expect(dialableDigits(ROAL)).toBe("4175551234");
    expect(forwardingInstructions("landline", "all", ROAL).steps[0].code).toBe("*724175551234");
    expect(forwardingInstructions("gsm_mobile", "backup", ROAL).steps[0].code).toBe("**004*4175551234#");
    expect(forwardingInstructions("gsm_mobile", "all", ROAL).cancel[0].code).toBe("##21#");
    expect(forwardingInstructions("verizon_wireless", "backup", ROAL).steps[0].code).toBe("*714175551234");
    const portal = forwardingInstructions("ringcentral", "backup", ROAL);
    expect(portal.steps.at(-1)?.code).toBe("(417) 555-1234");
  });
});

describe("forwarding test call", () => {
  let db: Db;
  const t0 = new Date("2026-10-28T20:00:00Z");
  beforeEach(async () => {
    resetMemoryStore();
    db = createMemoryDb();
    await seed(db);
  });

  it("calls the store number from the ROAL line with a silent call", async () => {
    const tw = fakeTwilio({ inbound: [], outbound: {} });
    const res = await startForwardingTest(db, RID, { fetchImpl: tw.fetchImpl, cfg, now: t0 });
    expect(res.ok).toBe(true);
    expect(tw.posts[0].path).toBe("/Calls.json");
    expect(tw.posts[0].form.get("From")).toBe(ROAL);
    expect(tw.posts[0].form.get("To")).toBe("+12017444665");
    expect(tw.posts[0].form.get("Twiml")).toContain("<Pause");
  });

  it("confirms forwarding when the call loops back to the ROAL line, then hangs up both legs", async () => {
    const tw = fakeTwilio({
      inbound: [{ sid: "CA_IN", from: ROAL, to: ROAL, direction: "inbound", status: "in-progress", forwarded_from: null, date_created: "2026-10-28T20:00:09Z" }],
      outbound: { status: "in-progress" },
    });
    await startForwardingTest(db, RID, { fetchImpl: tw.fetchImpl, cfg, now: t0 });
    const res = await checkForwardingTest(db, RID, { fetchImpl: tw.fetchImpl, cfg, now: new Date(t0.getTime() + 12_000) });
    expect(res).toMatchObject({ done: true, result: "forwarded" });
    expect((await loadForwardingRow(db, RID)).status).toBe("on");
    const hangups = tw.posts.filter((p) => p.form.get("Status") === "completed").map((p) => p.path);
    expect(hangups).toEqual(["/Calls/CA_IN.json", "/Calls/CA_OUT.json"]);
  });

  it("says someone answered at the store when the call connects there", async () => {
    const tw = fakeTwilio({ inbound: [], outbound: { status: "in-progress" } });
    await startForwardingTest(db, RID, { fetchImpl: tw.fetchImpl, cfg, now: t0 });
    const res = await checkForwardingTest(db, RID, { fetchImpl: tw.fetchImpl, cfg, now: new Date(t0.getTime() + 15_000) });
    expect(res).toMatchObject({ done: true, result: "answered_at_store" });
    expect((await loadForwardingRow(db, RID)).status).toBe("failed");
  });

  it("keeps waiting while the store phone rings, then reports not forwarded", async () => {
    const state = { inbound: [] as TwilioCallStub[], outbound: { status: "ringing" } as Record<string, unknown> };
    const tw = fakeTwilio(state);
    await startForwardingTest(db, RID, { fetchImpl: tw.fetchImpl, cfg, now: t0 });
    expect(await checkForwardingTest(db, RID, { fetchImpl: tw.fetchImpl, cfg, now: new Date(t0.getTime() + 20_000) })).toEqual({ done: false });
    state.outbound = { status: "no-answer", duration: "0" };
    const res = await checkForwardingTest(db, RID, { fetchImpl: tw.fetchImpl, cfg, now: new Date(t0.getTime() + 50_000) });
    expect(res).toMatchObject({ done: true, result: "not_forwarded" });
  });

  it("marks forwarding on when a real caller reaches the ROAL line", async () => {
    const tw = fakeTwilio({
      inbound: [{ sid: "CA9", from: "+12015550199", to: ROAL, direction: "inbound", status: "completed", forwarded_from: "+12017444665", date_created: "2026-10-28T18:00:00Z" }],
      outbound: {},
    });
    const seen = await detectLiveForwardedCalls(db, RID, new Date("2026-10-28T00:00:00Z"), { fetchImpl: tw.fetchImpl, cfg });
    expect(seen).toBeTruthy();
    expect(await loadForwardingRow(db, RID)).toMatchObject({ status: "on", verified_by: "live_calls" });
  });
});

describe("daily forwarding check", () => {
  let db: Db;
  const now = new Date("2026-10-29T03:30:00Z"); // Wednesday evening in New York
  beforeEach(async () => {
    resetMemoryStore();
    db = createMemoryDb();
    await seed(db);
    await saveForwardingRow(db, RID, { status: "on", carrier: "landline" });
    await db.from("restaurant_weekly_hours").insert({ restaurant_id: RID, day_of_week: 3, is_closed: false, open_time: "11:00", close_time: "22:00" });
  });

  it("flags a quiet open day once and notifies the owner", async () => {
    const notify = vi.fn(async () => true);
    const detect = vi.fn(async () => null);
    const first = await runForwardingDailyCheck(db, { now, detect, notify });
    expect(first).toMatchObject({ checked: 1, quiet: 1, alerted: 1 });
    expect(notify).toHaveBeenCalledWith(db, expect.objectContaining({ eventType: "forwarding_quiet", restaurantId: RID }));
    expect((await loadForwardingRow(db, RID)).status).toBe("quiet");

    await runForwardingDailyCheck(db, { now, detect, notify });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("stays quiet on a closed day and when calls came through", async () => {
    const notify = vi.fn(async () => true);
    expect(await runForwardingDailyCheck(db, { now, detect: vi.fn(async () => "2026-10-28T19:00:00Z"), notify })).toMatchObject({ seen: 1, quiet: 0 });
    await db.from("restaurant_weekly_hours").update({ is_closed: true }).eq("restaurant_id", RID);
    expect(await runForwardingDailyCheck(db, { now, detect: vi.fn(async () => null), notify })).toMatchObject({ quiet: 0 });
    expect(notify).not.toHaveBeenCalled();
  });
});
