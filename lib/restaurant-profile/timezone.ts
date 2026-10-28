/** ROAL's first market is New Jersey; a restaurant with no other clue is on Eastern time. */
export const DEFAULT_RESTAURANT_TIMEZONE = "America/New_York";

const ZONES: Record<string, string[]> = {
  "America/New_York": ["CT", "DE", "DC", "FL", "GA", "IN", "KY", "ME", "MD", "MA", "MI", "NH", "NJ", "NY", "NC", "OH", "PA", "RI", "SC", "VT", "VA", "WV"],
  "America/Chicago": ["AL", "AR", "IL", "IA", "KS", "LA", "MN", "MS", "MO", "NE", "ND", "OK", "SD", "TN", "TX", "WI"],
  "America/Denver": ["CO", "MT", "NM", "UT", "WY", "ID"],
  "America/Phoenix": ["AZ"],
  "America/Los_Angeles": ["CA", "NV", "OR", "WA"],
  "America/Anchorage": ["AK"],
  "Pacific/Honolulu": ["HI"],
};

const STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
  "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

/** "NJ" or "New Jersey" → "America/New_York"; null when the state is unknown. */
export function timezoneForUsState(region: string | null | undefined): string | null {
  const raw = region?.trim();
  if (!raw) return null;
  const code = raw.length === 2 ? raw.toUpperCase() : STATE_NAMES[raw.toLowerCase()];
  if (!code) return null;
  for (const [zone, states] of Object.entries(ZONES)) if (states.includes(code)) return zone;
  return null;
}

function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** A stated zone wins; then the US state; then Eastern. */
export function resolveRestaurantTimezone(input: {
  timezone?: string | null;
  region?: string | null;
}): string {
  const stated = input.timezone?.trim();
  if (stated && isValidZone(stated)) return stated;
  return timezoneForUsState(input.region) ?? DEFAULT_RESTAURANT_TIMEZONE;
}
