import type { SupabaseClient } from "@supabase/supabase-js";
import { loadOrganizationGateVerdicts } from "@/lib/billing/assert-gate";
import type { GateVerdict } from "@/lib/billing/gates";
import type { BillingGateAction } from "@/lib/billing/gates";
import { getPublicEnv } from "@/lib/env.public";
import {
  loadRestaurantMenu,
  type RestaurantMenuSnapshot,
} from "@/lib/menu-editor/load-menu";
import {
  buildTemplateOverrideDiff,
  listOrganizationMenuTemplates,
  loadOrganizationMenuTemplatePayload,
  type TemplateOverrideDiff,
  type OrganizationMenuTemplate,
} from "@/lib/menu-editor/copy-menu";
import { loadRestaurantHoursBundle } from "@/lib/restaurant-hours/helpers";
import type { RestaurantHoursBundle } from "@/lib/restaurant-hours/types";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { loadRestaurantKnowledgeEntries } from "@/lib/restaurant-knowledge/helpers";
import { serializeKnowledgeEntries } from "@/lib/restaurant-knowledge/schema";
import { loadRestaurantUpsellRules } from "@/lib/restaurant-upsell/helpers";
import { serializeUpsellRules } from "@/lib/restaurant-upsell/schema";
import { supabaseProjectRefFromUrl } from "@/lib/supabaseProjectRef";
import { loadVoiceAgentControlCenter } from "@/lib/voice-agent/load-control-center";
import type { VoiceAgentControlCenterSnapshot } from "@/lib/voice-agent/control-center-types";
import type { Restaurant, RestaurantProfile } from "@/lib/types";

export type RestaurantMenuSetupPageData = {
  restaurant: Restaurant;
  menu: RestaurantMenuSnapshot;
  menuCopySources: Array<{ id: string; name: string }>;
  menuTemplates: OrganizationMenuTemplate[];
  inheritedTemplateDiff: TemplateOverrideDiff | null;
  billingGates: Record<BillingGateAction, GateVerdict> | null;
  profile: RestaurantProfile;
  knowledgeBaseText: string;
  upsellRulesText: string;
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

  const [
    billingGates,
    menu,
    menuCopySourcesResult,
    menuTemplates,
    profile,
    hoursBundle,
    knowledgeEntries,
    upsellRules,
  ] = await Promise.all([
    loadOrganizationGateVerdicts(supabase, {
      organizationId,
      membershipRole,
    }),
    loadRestaurantMenu(supabase, restaurantId),
    supabase
      .from("restaurants")
      .select("id, name")
      .eq("organization_id", organizationId)
      .neq("id", restaurantId)
      .order("name", { ascending: true }),
    listOrganizationMenuTemplates(supabase, organizationId).catch(() => []),
    ensureRestaurantProfile(supabase, restaurantId, organizationId),
    loadRestaurantHoursBundle(supabase, restaurantId),
    loadRestaurantKnowledgeEntries(supabase, restaurantId).catch(() => []),
    loadRestaurantUpsellRules(supabase, restaurantId).catch(() => []),
  ]);

  if (menuCopySourcesResult.error) {
    throw new Error(menuCopySourcesResult.error.message);
  }

  const supabaseUrl = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const voiceAgentCenter = await loadVoiceAgentControlCenter({
    restaurantId,
    restaurantName: restaurant.name,
    edgeBase: supabaseUrl.replace(/\/$/, ""),
    supabaseRef: supabaseProjectRefFromUrl(supabaseUrl),
    profile,
  });
  let inheritedTemplateDiff: TemplateOverrideDiff | null = null;
  const inheritedTemplateId = restaurant.inherited_menu_template_id?.trim();
  if (inheritedTemplateId) {
    try {
      const inheritedPayload = await loadOrganizationMenuTemplatePayload(supabase, {
        organizationId,
        templateId: inheritedTemplateId,
      });
      inheritedTemplateDiff = buildTemplateOverrideDiff(inheritedPayload, menu);
    } catch {
      inheritedTemplateDiff = null;
    }
  }

  return {
    restaurant,
    menu,
    menuCopySources: (menuCopySourcesResult.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
    })),
    menuTemplates,
    inheritedTemplateDiff,
    billingGates,
    profile,
    knowledgeBaseText: serializeKnowledgeEntries(knowledgeEntries),
    upsellRulesText: serializeUpsellRules(upsellRules),
    hoursBundle,
    voiceAgentCenter,
  };
}
