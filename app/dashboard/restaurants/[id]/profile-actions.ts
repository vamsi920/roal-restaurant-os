"use server";

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { updateRestaurantOnboardingStep } from "@/lib/onboarding/helpers";
import {
  RestaurantProfileInputSchema,
  type RestaurantProfileInput,
} from "@/lib/restaurant-profile/schema";
import { upsertRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { replaceRestaurantKnowledgeEntries } from "@/lib/restaurant-knowledge/helpers";
import { parseKnowledgeText } from "@/lib/restaurant-knowledge/schema";
import { replaceRestaurantUpsellRules } from "@/lib/restaurant-upsell/helpers";
import { parseUpsellRulesText } from "@/lib/restaurant-upsell/schema";
import { afterProfileSettingsMutation } from "@/lib/voice-agent/after-restaurant-settings-mutation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function saveRestaurantProfileSettingsAction(
  restaurantId: string,
  raw: RestaurantProfileInput
) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    const status = access.errorResponse.status;
    if (status === 401) throw new Error("Sign in to save settings.");
    if (status === 404) throw new Error("Restaurant not found.");
    throw new Error("You do not have access to this restaurant.");
  }

  const parsed = RestaurantProfileInputSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid profile data";
    throw new Error(msg);
  }

  const supabase = await createServerSupabase();
  const profile = await upsertRestaurantProfile(
    supabase,
    restaurantId,
    access.access.restaurant.organization_id,
    parsed.data
  );

  if (parsed.data.knowledge_base_text !== undefined) {
    await replaceRestaurantKnowledgeEntries(supabase, {
      restaurantId,
      organizationId: access.access.restaurant.organization_id,
      entries: parseKnowledgeText(parsed.data.knowledge_base_text),
    });
  }
  if (parsed.data.upsell_rules_text !== undefined) {
    await replaceRestaurantUpsellRules(supabase, {
      restaurantId,
      organizationId: access.access.restaurant.organization_id,
      rules: parseUpsellRulesText(parsed.data.upsell_rules_text),
    });
  }

  await updateRestaurantOnboardingStep(
    supabase,
    restaurantId,
    access.access.restaurant.organization_id,
    "restaurant_profile",
    "completed"
  );

  afterProfileSettingsMutation(restaurantId, {
    userId: access.context.user.id,
    restaurantName: parsed.data.name,
  });

  return { ok: true as const, profile };
}
