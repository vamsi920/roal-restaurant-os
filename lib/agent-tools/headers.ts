import { mintAgentToolToken } from "@/lib/agent-tools/token";

/** Sent on every webhook call when tools are baked to a restaurant (Twilio cannot resolve conv dynamic vars). */
export const ROAL_RESTAURANT_ID_HEADER = "x-roal-restaurant-id";

export const ROAL_IDEMPOTENCY_HEADER = "x-roal-idempotency-key";

/** Headers for ElevenLabs webhook tools (baked restaurant). */
export function buildAgentToolRequestHeaders(input: {
  restaurantId: string;
  restaurantName?: string;
  agentId?: string | null;
  /** Legacy global secret when signing is unavailable. */
  legacySecret?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
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
