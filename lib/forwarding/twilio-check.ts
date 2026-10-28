import type { Db } from "@/lib/db";
import { toE164Phone } from "@/lib/phone/e164";
import { twilioConfig } from "@/lib/telephony/provision-phone-line";
import {
  loadForwardingPhones,
  loadForwardingRow,
  saveForwardingRow,
  type ForwardingRow,
  type ForwardingTestResult,
} from "@/lib/forwarding/state";

/**
 * Checks from ROAL's side that the store number forwards to the restaurant's ROAL line.
 *
 * Test call: the ROAL line calls the store number and stays silent. If forwarding works,
 * the carrier sends that call straight back to the ROAL line, so Twilio shows an inbound
 * call to the ROAL line from itself (or with ForwardedFrom = store number). We then hang
 * both legs up so the host doesn't sit on a silent call.
 *
 * Live calls: inbound calls to the ROAL line from real callers show forwarding is on.
 */

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
type TwilioCfg = { sid: string; token: string };

export type TwilioCall = {
  sid: string;
  from: string;
  to: string;
  direction: string;
  status: string;
  forwarded_from: string | null;
  date_created: string;
};

/** Give up on a test after this long (backup mode rings the store phone ~20–30s first). */
export const TEST_TIMEOUT_MS = 75_000;
const ENDED = new Set(["completed", "busy", "failed", "no-answer", "canceled"]);

async function twilioRequest(fetchImpl: FetchFn, cfg: TwilioCfg, path: string, form?: Record<string, string>) {
  const res = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}${path}`, {
    method: form ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.sid}:${cfg.token}`).toString("base64")}`,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
    signal: AbortSignal.timeout(8000),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(`Twilio ${res.status}: ${String(body.message ?? "request failed")}`) as Error & { code?: unknown };
    err.code = body.code;
    throw err;
  }
  return body;
}

/** Inbound calls to the ROAL line created at or after `since`, newest first. */
export async function listInboundCalls(
  fetchImpl: FetchFn,
  cfg: TwilioCfg,
  roalPhone: string,
  since: Date
): Promise<TwilioCall[]> {
  const day = since.toISOString().slice(0, 10);
  const q = new URLSearchParams({ To: roalPhone, "StartTime>": day, PageSize: "100" });
  const body = await twilioRequest(fetchImpl, cfg, `/Calls.json?${q.toString()}`);
  const calls = Array.isArray(body.calls) ? (body.calls as TwilioCall[]) : [];
  return calls
    .filter((c) => c.direction === "inbound" && new Date(c.date_created).getTime() >= since.getTime() - 5000)
    .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
}

function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = toE164Phone(a ?? null);
  return Boolean(x) && x === toE164Phone(b ?? null);
}

export type StartTestResult =
  | { ok: true; row: ForwardingRow }
  | { ok: false; reason: "no_line" | "no_store_phone" | "not_configured" | "failed"; message: string };

export async function startForwardingTest(
  db: Db,
  restaurantId: string,
  deps: { fetchImpl?: FetchFn; cfg?: TwilioCfg | null; now?: Date } = {}
): Promise<StartTestResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const cfg = deps.cfg === undefined ? twilioConfig() : deps.cfg;
  const { storePhone, roalPhone } = await loadForwardingPhones(db, restaurantId);
  const store = toE164Phone(storePhone);
  if (!roalPhone) return { ok: false, reason: "no_line", message: "Your ROAL phone line isn't ready yet." };
  if (!store) return { ok: false, reason: "no_store_phone", message: "Add your restaurant's phone number in Settings first." };
  if (!cfg) return { ok: false, reason: "not_configured", message: "Test calls aren't available right now." };

  try {
    const call = await twilioRequest(fetchImpl, cfg, "/Calls.json", {
      From: roalPhone,
      To: store,
      Twiml: '<Response><Pause length="60"/><Hangup/></Response>',
      Timeout: "45",
    });
    const row = await saveForwardingRow(db, restaurantId, {
      last_test: { outbound_sid: String(call.sid), started_at: (deps.now ?? new Date()).toISOString(), result: null },
    });
    return { ok: true, row };
  } catch (e) {
    console.error("[forwarding] test call failed to start", e);
    return { ok: false, reason: "failed", message: "We couldn't place the test call. Try again in a minute." };
  }
}

export type CheckTestResult = { done: false } | { done: true; result: ForwardingTestResult; row: ForwardingRow };

/** Polled by the setup page while a test call is running. */
export async function checkForwardingTest(
  db: Db,
  restaurantId: string,
  deps: { fetchImpl?: FetchFn; cfg?: TwilioCfg | null; now?: Date } = {}
): Promise<CheckTestResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const cfg = deps.cfg === undefined ? twilioConfig() : deps.cfg;
  const now = deps.now ?? new Date();
  const row = await loadForwardingRow(db, restaurantId);
  const test = row.last_test;
  if (!test) return { done: true, result: "error", row };
  if (test.result) return { done: true, result: test.result, row };

  const { storePhone, roalPhone } = await loadForwardingPhones(db, restaurantId);
  if (!cfg || !roalPhone) return finish(db, restaurantId, "error");

  const startedAt = new Date(test.started_at);
  const inbound = await listInboundCalls(fetchImpl, cfg, roalPhone, startedAt);
  const looped = inbound.find((c) => samePhone(c.from, roalPhone) || samePhone(c.forwarded_from, storePhone));
  if (looped) {
    await hangUp(fetchImpl, cfg, looped.sid);
    await hangUp(fetchImpl, cfg, test.outbound_sid);
    return finish(db, restaurantId, "forwarded", { status: "on", verified_at: now.toISOString(), verified_by: "test_call", quiet_since: null, last_seen_at: now.toISOString() });
  }

  const outbound = await twilioRequest(fetchImpl, cfg, `/Calls/${test.outbound_sid}.json`).catch(() => null);
  const status = typeof outbound?.status === "string" ? outbound.status : "";
  const duration = Number(outbound?.duration ?? 0);
  const elapsed = now.getTime() - startedAt.getTime();

  if (status === "in-progress" && elapsed > 8000) {
    // A person (or voicemail) picked up at the store instead of the call being forwarded.
    await hangUp(fetchImpl, cfg, test.outbound_sid);
    return finish(db, restaurantId, "answered_at_store", { status: row.status === "on" ? "on" : "failed" });
  }
  if ((ENDED.has(status) && elapsed > 10_000) || elapsed > TEST_TIMEOUT_MS) {
    if (!ENDED.has(status)) await hangUp(fetchImpl, cfg, test.outbound_sid);
    const result: ForwardingTestResult = status === "completed" && duration > 0 ? "answered_at_store" : "not_forwarded";
    return finish(db, restaurantId, result, { status: row.status === "on" ? "on" : "failed" });
  }
  return { done: false };
}

async function hangUp(fetchImpl: FetchFn, cfg: TwilioCfg, sid: string) {
  await twilioRequest(fetchImpl, cfg, `/Calls/${sid}.json`, { Status: "completed" }).catch(() => null);
}

async function finish(
  db: Db,
  restaurantId: string,
  result: ForwardingTestResult,
  patch: Partial<ForwardingRow> = {}
): Promise<CheckTestResult> {
  const current = await loadForwardingRow(db, restaurantId);
  const row = await saveForwardingRow(db, restaurantId, {
    ...patch,
    last_test: current.last_test ? { ...current.last_test, result } : null,
  });
  return { done: true, result, row };
}

/**
 * Looks for real callers reaching the ROAL line since `since`. Marks forwarding on when found.
 * Returns the newest such call time, or null.
 */
export async function detectLiveForwardedCalls(
  db: Db,
  restaurantId: string,
  since: Date,
  deps: { fetchImpl?: FetchFn; cfg?: TwilioCfg | null; now?: Date } = {}
): Promise<string | null> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const cfg = deps.cfg === undefined ? twilioConfig() : deps.cfg;
  const { roalPhone } = await loadForwardingPhones(db, restaurantId);
  if (!cfg || !roalPhone) return null;
  const calls = await listInboundCalls(fetchImpl, cfg, roalPhone, since);
  const real = calls.find((c) => !samePhone(c.from, roalPhone));
  if (!real) return null;
  const row = await loadForwardingRow(db, restaurantId);
  await saveForwardingRow(db, restaurantId, {
    status: "on",
    last_seen_at: real.date_created ? new Date(real.date_created).toISOString() : (deps.now ?? new Date()).toISOString(),
    quiet_since: null,
    verified_at: row.verified_at ?? (deps.now ?? new Date()).toISOString(),
    verified_by: row.verified_by ?? "live_calls",
  });
  return real.date_created;
}
