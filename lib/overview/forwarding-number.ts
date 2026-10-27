import { getPublicEnv } from "@/lib/env.public";
import { supabaseProjectRefFromUrl } from "@/lib/supabaseProjectRef";
import { loadVoiceAgentControlCenter } from "@/lib/voice-agent/load-control-center";
import type { RestaurantProfile } from "@/lib/types";

const PHONE_PATTERN = /\+?1?[ (]?\d{3}[) .-]?\d{3}[ .-]?\d{4}\b/;

/**
 * Best-effort number to forward the store line to (welcome card). Mirrors the
 * kitchen page: read it from the voice-agent checklist, else null (mailto).
 */
export async function loadForwardingNumber(
  restaurantId: string,
  restaurantName: string,
  profile: RestaurantProfile
): Promise<string | null> {
  try {
    const supabaseUrl = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
    const center = await loadVoiceAgentControlCenter({
      restaurantId,
      restaurantName,
      edgeBase: supabaseUrl.replace(/\/$/, ""),
      supabaseRef: supabaseProjectRefFromUrl(supabaseUrl),
      profile,
    });
    for (const item of center.checklist) {
      if (!/phone|number|twilio/i.test(item.label)) continue;
      const match = `${item.label} ${item.detail ?? ""}`.match(PHONE_PATTERN);
      if (match) return match[0].trim();
    }
  } catch {
    // Optional for the welcome card.
  }
  return null;
}
