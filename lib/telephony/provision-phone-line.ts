import type { Db } from "@/lib/db";
import { assignPhoneNumberToAgent, importTwilioPhoneNumber } from "@/lib/elevenlabs";
import { getServerEnv } from "@/lib/env.server";

/**
 * Each restaurant gets its own local phone line when its plan starts: we buy a number near
 * the restaurant, connect it to that restaurant's host, and save it so the dashboard can show
 * it with call-forwarding steps. Idempotent: a restaurant that already has a line keeps it.
 */

export type PhoneLineResult =
  | { ok: true; phoneNumber: string; alreadyHad: boolean }
  | { ok: false; reason: "not_configured" | "host_not_ready" | "no_numbers" | "failed"; message: string };

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export function twilioConfig(): { sid: string; token: string } | null {
  const env = getServerEnv();
  const sid = env.TWILIO_ACCOUNT_SID?.trim();
  const token = env.TWILIO_AUTH_TOKEN?.trim();
  return sid && token ? { sid, token } : null;
}

/** Area code of a US/Canada number, used to pick a line callers will recognize as local. */
export function areaCodeOf(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return national.length === 10 ? national.slice(0, 3) : null;
}

async function twilio(fetchImpl: FetchFn, cfg: { sid: string; token: string }, path: string, init?: RequestInit) {
  const res = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.sid}:${cfg.token}`).toString("base64")}`,
      ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${String(body.message ?? "request failed")}`);
  return body;
}

/** First available local voice number, trying the restaurant's area code before any US number. */
export async function findLocalNumber(
  fetchImpl: FetchFn,
  cfg: { sid: string; token: string },
  areaCode: string | null
): Promise<string | null> {
  for (const query of [areaCode ? `AreaCode=${areaCode}&` : null, ""]) {
    if (query === null) continue;
    const body = await twilio(fetchImpl, cfg, `/AvailablePhoneNumbers/US/Local.json?${query}VoiceEnabled=true&PageSize=1`);
    const list = Array.isArray(body.available_phone_numbers) ? (body.available_phone_numbers as Array<{ phone_number?: string }>) : [];
    if (list[0]?.phone_number) return list[0].phone_number;
  }
  return null;
}

export async function provisionRestaurantPhoneLine(
  db: Db,
  restaurantId: string,
  deps: {
    fetchImpl?: FetchFn;
    importNumber?: typeof importTwilioPhoneNumber;
    assignNumber?: typeof assignPhoneNumberToAgent;
  } = {}
): Promise<PhoneLineResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const importNumber = deps.importNumber ?? importTwilioPhoneNumber;
  const assignNumber = deps.assignNumber ?? assignPhoneNumberToAgent;

  const { data: restaurant } = await db.from("restaurants").select("id, name").eq("id", restaurantId).maybeSingle();
  const { data: profile } = await db
    .from("restaurant_profiles")
    .select("phone, elevenlabs_agent_id, roal_phone_number")
    .eq("restaurant_id", restaurantId)
    .maybeSingle<{ phone: string | null; elevenlabs_agent_id: string | null; roal_phone_number?: string | null }>();

  if (profile?.roal_phone_number) return { ok: true, phoneNumber: profile.roal_phone_number, alreadyHad: true };

  const cfg = twilioConfig();
  if (!cfg) return { ok: false, reason: "not_configured", message: "Phone line purchasing isn't set up on this server." };
  const agentId = profile?.elevenlabs_agent_id?.trim();
  if (!agentId) return { ok: false, reason: "host_not_ready", message: "The phone host isn't set up yet; we'll add the line after." };

  try {
    const number = await findLocalNumber(fetchImpl, cfg, areaCodeOf(profile?.phone));
    if (!number) return { ok: false, reason: "no_numbers", message: "No phone numbers available right now." };

    const bought = await twilio(fetchImpl, cfg, "/IncomingPhoneNumbers.json", {
      method: "POST",
      body: new URLSearchParams({
        PhoneNumber: number,
        FriendlyName: `ROAL · ${String(restaurant?.name ?? restaurantId).slice(0, 40)}`,
      }).toString(),
    });

    const { phone_number_id } = await importNumber({
      phoneNumber: number,
      label: `ROAL · ${String(restaurant?.name ?? restaurantId).slice(0, 40)}`,
      twilioAccountSid: cfg.sid,
      twilioAuthToken: cfg.token,
    });
    await assignNumber(phone_number_id, agentId);

    await db
      .from("restaurant_profiles")
      .update({
        roal_phone_number: number,
        roal_phone_number_sid: typeof bought.sid === "string" ? bought.sid : null,
        roal_phone_number_id: phone_number_id,
        roal_phone_number_at: new Date().toISOString(),
      })
      .eq("restaurant_id", restaurantId);

    return { ok: true, phoneNumber: number, alreadyHad: false };
  } catch (e) {
    console.error("[phone line]", restaurantId, e instanceof Error ? e.message : e);
    return { ok: false, reason: "failed", message: "We couldn't set up the phone line yet. We'll retry." };
  }
}

/**
 * Call when an organization's plan becomes active (payment confirmed): every location gets
 * its line. Safe to call again; locations that already have one are skipped.
 */
export async function provisionPhoneLinesForOrganization(db: Db, organizationId: string) {
  const { data: restaurants } = await db.from("restaurants").select("id").eq("organization_id", organizationId);
  const results: Array<{ restaurantId: string; result: PhoneLineResult }> = [];
  for (const r of restaurants ?? []) {
    results.push({ restaurantId: r.id as string, result: await provisionRestaurantPhoneLine(db, r.id as string) });
  }
  return results;
}
