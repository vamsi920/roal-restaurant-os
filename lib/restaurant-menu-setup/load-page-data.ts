import type { SupabaseClient } from "@supabase/supabase-js";
import { loadOrganizationGateVerdicts } from "@/lib/billing/assert-gate";
import type { GateVerdict } from "@/lib/billing/gates";
import type { BillingGateAction } from "@/lib/billing/gates";
import { getPublicEnv } from "@/lib/env.public";
import {
  loadRestaurantMenu,
  type RestaurantMenuSnapshot,
} from "@/lib/menu-editor/load-menu";
import { loadRestaurantHoursBundle } from "@/lib/restaurant-hours/helpers";
import type { RestaurantHoursBundle } from "@/lib/restaurant-hours/types";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { supabaseProjectRefFromUrl } from "@/lib/supabaseProjectRef";
import { loadVoiceAgentControlCenter } from "@/lib/voice-agent/load-control-center";
import type { VoiceAgentControlCenterSnapshot } from "@/lib/voice-agent/control-center-types";
import type { Restaurant, RestaurantProfile } from "@/lib/types";

export type RestaurantMenuSetupPageData = {
  restaurant: Restaurant;
  menu: RestaurantMenuSnapshot;
  billingGates: Record<BillingGateAction, GateVerdict> | null;
  profile: RestaurantProfile;
  hoursBundle: RestaurantHoursBundle | null;
  voiceAgentCenter: VoiceAgentControlCenterSnapshot;
};

export async function loadRestaurantMenuSetupPageData(
  supabase: SupabaseClient,
  input: {
    restaurant: Restaurant;
    organizationId: string;
    membershipRole: Parameters<
      typeof loadOrganizationGateVerdicts
    >[1]["membershipRole"];
  }
): Promise<RestaurantMenuSetupPageData> {
  const { restaurant, organizationId, membershipRole } = input;
  const restaurantId = restaurant.id;

  const [billingGates, menu, profile, hoursBundle] = await Promise.all([
    loadOrganizationGateVerdicts(supabase, {
      organizationId,
      membershipRole,
    }),
    loadRestaurantMenu(supabase, restaurantId),
    ensureRestaurantProfile(supabase, restaurantId, organizationId),
    loadRestaurantHoursBundle(supabase, restaurantId),
  ]);

  const supabaseUrl = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const voiceAgentCenter = await loadVoiceAgentControlCenter({
    restaurantId,
    restaurantName: restaurant.name,
    edgeBase: supabaseUrl.replace(/\/$/, ""),
    supabaseRef: supabaseProjectRefFromUrl(supabaseUrl),
    profile,
  });

  return {
    restaurant,
    menu,
    billingGates,
    profile,
    hoursBundle,
    voiceAgentCenter,
  };
}
