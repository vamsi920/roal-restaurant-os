import type { Db } from "@/lib/db";
import type { ElevenLabsProvisionStatus } from "@/lib/types";

/** One location as the app shell sees it (sidebar, switcher, status switch). */
export type ShellLocation = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string | null;
  agentDisplayName: string | null;
  temporarilyClosed: boolean;
  provisionStatus: ElevenLabsProvisionStatus | null;
  /** Voice host provisioned and answering calls. */
  isLive: boolean;
  /** Pending "couldn't answer" caller questions. */
  pendingQuestions: number;
};

export type ShellLocationStatus = "live" | "paused" | "setup";

export function shellLocationStatus(
  location: Pick<ShellLocation, "isLive" | "temporarilyClosed">
): ShellLocationStatus {
  if (!location.isLive) return "setup";
  return location.temporarilyClosed ? "paused" : "live";
}

type RestaurantRow = { id: string; name: string; organization_id: string };
type ProfileRow = {
  restaurant_id: string;
  agent_display_name: string | null;
  temporarily_closed: boolean | null;
  elevenlabs_provision_status: ElevenLabsProvisionStatus | null;
};

export function buildShellLocations(input: {
  restaurants: RestaurantRow[];
  profiles: ProfileRow[];
  pendingQuestionRestaurantIds: string[];
  organizationNames: Record<string, string>;
}): ShellLocation[] {
  const profiles = new Map(input.profiles.map((p) => [p.restaurant_id, p]));
  const pending = new Map<string, number>();
  for (const id of input.pendingQuestionRestaurantIds) {
    pending.set(id, (pending.get(id) ?? 0) + 1);
  }
  return input.restaurants.map((r) => {
    const profile = profiles.get(r.id);
    const provisionStatus = profile?.elevenlabs_provision_status ?? null;
    return {
      id: r.id,
      name: r.name,
      organizationId: r.organization_id,
      organizationName: input.organizationNames[r.organization_id] ?? null,
      agentDisplayName: profile?.agent_display_name?.trim() || null,
      temporarilyClosed: Boolean(profile?.temporarily_closed),
      provisionStatus,
      isLive: provisionStatus === "ready",
      pendingQuestions: pending.get(r.id) ?? 0,
    };
  });
}

/**
 * Locations for the signed-in user's organizations. Never throws: the shell
 * must render even when a table is unavailable.
 */
export async function loadShellLocations(
  supabase: Db,
  organizations: Array<{ id: string; name: string }>
): Promise<ShellLocation[]> {
  const orgIds = organizations.map((o) => o.id);
  if (orgIds.length === 0) return [];
  try {
    const { data: restaurants, error } = await supabase
      .from("restaurants")
      .select("id, name, organization_id")
      .in("organization_id", orgIds)
      .order("created_at", { ascending: true });
    if (error || !restaurants?.length) return [];

    const ids = restaurants.map((r) => r.id as string);
    const [profilesRes, pendingRes] = await Promise.all([
      supabase
        .from("restaurant_profiles")
        .select("restaurant_id, agent_display_name, temporarily_closed, elevenlabs_provision_status")
        .in("restaurant_id", ids),
      supabase
        .from("restaurant_knowledge_suggestions")
        .select("restaurant_id")
        .in("restaurant_id", ids)
        .eq("status", "pending")
        .limit(1000),
    ]);

    return buildShellLocations({
      restaurants: restaurants as RestaurantRow[],
      profiles: (profilesRes.error ? [] : profilesRes.data ?? []) as ProfileRow[],
      pendingQuestionRestaurantIds: pendingRes.error
        ? []
        : (pendingRes.data ?? []).map((row) => row.restaurant_id as string),
      organizationNames: Object.fromEntries(organizations.map((o) => [o.id, o.name])),
    });
  } catch {
    return [];
  }
}
