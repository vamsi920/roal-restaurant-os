import { mintAgentToolToken } from "@/lib/agent-tools/token";
import { ROAL_RESTAURANT_ID_HEADER } from "@/lib/sync-elevenlabs-roal-tools";

export { ROAL_RESTAURANT_ID_HEADER };

export const ROAL_IDEMPOTENCY_HEADER = "x-roal-idempotency-key";

/** Headers for ElevenLabs webhook tools (baked restaurant). */
export function buildAgentToolRequestHeaders(input: {
  restaurantId: string;
  restaurantName?: string;
  agentId?: string | null;
  supabaseAnonKey: string;
  /** Legacy global secret when signing is unavailable. */
  legacySecret?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: input.supabaseAnonKey,
    [ROAL_RESTAURANT_ID_HEADER]: input.restaurantId,
  };

  try {
    const token = mintAgentToolToken({
      restaurantId: input.restaurantId,
      agentId: input.agentId,
    });
    headers.Authorization = `Bearer ${token}`;
  } catch {
    if (input.legacySecret) {
      headers.Authorization = `Bearer ${input.legacySecret}`;
    }
  }

  return headers;
}
