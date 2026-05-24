import {
  AGENT_TOOL_RESTAURANT_ID_RE,
  normalizeRestaurantUuid,
} from "@/lib/agent-tools/token";

export { AGENT_TOOL_RESTAURANT_ID_RE as UUID_RE };

function pushRestaurantCandidate(candidates: string[], raw: string | null | undefined): void {
  if (typeof raw !== "string") return;
  const trimmed = raw.trim();
  if (!AGENT_TOOL_RESTAURANT_ID_RE.test(trimmed)) return;
  candidates.push(normalizeRestaurantUuid(trimmed));
}

export function resolveRestaurantId(input: {
  fromHeader: string | null;
  fromBody: unknown;
  fromQuery: string | null;
  tokenRestaurantId?: string;
}): string | null {
  const candidates: string[] = [];
  pushRestaurantCandidate(candidates, input.tokenRestaurantId);
  if (typeof input.fromBody === "string") {
    pushRestaurantCandidate(candidates, input.fromBody);
  }
  pushRestaurantCandidate(candidates, input.fromHeader);
  pushRestaurantCandidate(candidates, input.fromQuery);

  if (candidates.length === 0) return null;
  const first = candidates[0];
  if (candidates.some((c) => c !== first)) {
    return null;
  }
  return first;
}
