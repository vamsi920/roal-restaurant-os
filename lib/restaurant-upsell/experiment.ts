export type UpsellExperimentVariant = "treatment" | "control";

export function hashUpsellExperimentKey(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getUpsellExperimentVariant(
  restaurantId: string,
  sessionId: string | null | undefined
): UpsellExperimentVariant {
  const sid = sessionId?.trim();
  if (!sid) return "treatment";
  const bucket = hashUpsellExperimentKey(`${restaurantId.trim()}:${sid}`) % 100;
  return bucket < 50 ? "treatment" : "control";
}
