/** Read ElevenLabs agent GET payload → dynamic_variable_placeholders map. */
export function readAgentDynamicPlaceholders(agentRoot: unknown): Record<
  string,
  string
> {
  const out: Record<string, string> = {};
  if (!agentRoot || typeof agentRoot !== "object") return out;
  const conv = (agentRoot as Record<string, unknown>).conversation_config;
  if (!conv || typeof conv !== "object") return out;
  const ag = (conv as Record<string, unknown>).agent;
  if (!ag || typeof ag !== "object") return out;
  const dv = (ag as Record<string, unknown>).dynamic_variables;
  if (!dv || typeof dv !== "object") return out;
  const ph = (dv as Record<string, unknown>).dynamic_variable_placeholders;
  if (!ph || typeof ph !== "object" || Array.isArray(ph)) return out;
  for (const [k, v] of Object.entries(ph as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

const DEFAULT_RESTAURANT_NAME = "the restaurant";

/** Never leave restaurant_name empty — phone/Twilio sessions can omit client-passed vars until stream is up. */
export function mergeRestaurantPlaceholders(
  existing: Record<string, string>,
  restaurantId: string,
  restaurantName: string
): Record<string, string> {
  const id = restaurantId.trim();
  const name = restaurantName.trim() || DEFAULT_RESTAURANT_NAME;
  return {
    ...existing,
    restaurant_id: id,
    restaurant_name: name,
  };
}
