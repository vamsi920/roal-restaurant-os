"use server";

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { ensureVoiceReady } from "@/lib/trial/elevenlabs";
import { findTrialVoice } from "@/lib/trial/voices";
import { afterProfileSettingsMutation } from "@/lib/voice-agent/after-restaurant-settings-mutation";

export type HostPersonaInput = {
  agentDisplayName: string;
  agentVoiceId: string;
  agentGreeting: string;
};

export type HostPersonaResult = {
  ok: true;
  agentDisplayName: string;
  agentVoiceId: string | null;
  agentVoiceLabel: string | null;
  agentGreeting: string | null;
};

function accessError(status: number): never {
  if (status === 401) throw new Error("Sign in to save the host persona.");
  if (status === 404) throw new Error("Restaurant not found.");
  throw new Error("You do not have access to this restaurant.");
}

/**
 * Save the phone host's name, voice, and optional greeting, then re-patch the
 * ElevenLabs agent through the same content-change sync profile saves use.
 */
export async function saveHostPersonaAction(
  restaurantId: string,
  raw: HostPersonaInput
): Promise<HostPersonaResult> {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) accessError(access.errorResponse.status);

  const name = raw.agentDisplayName.trim().slice(0, 40);
  if (!name) throw new Error("Give your host a name.");

  const voice = findTrialVoice(raw.agentVoiceId);
  if (raw.agentVoiceId.trim() && !voice) {
    throw new Error("Pick one of the available voices.");
  }

  const greeting = raw.agentGreeting.trim().slice(0, 400) || null;
  if (voice) await ensureVoiceReady(voice.id);

  const supabase = getDb();
  const { error } = await supabase
    .from("restaurant_profiles")
    .update({
      agent_display_name: name,
      agent_voice_id: voice?.id ?? null,
      agent_voice_label: voice?.label ?? null,
      agent_greeting: greeting,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId);
  if (error) throw new Error(error.message);

  afterProfileSettingsMutation(restaurantId, {
    userId: access.context.user.id,
    restaurantName: access.access.restaurant.name,
  });

  return {
    ok: true,
    agentDisplayName: name,
    agentVoiceId: voice?.id ?? null,
    agentVoiceLabel: voice?.label ?? null,
    agentGreeting: greeting,
  };
}
