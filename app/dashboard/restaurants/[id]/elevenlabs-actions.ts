"use server";

import { applyRestaurantOrderAgentProfile } from "@/lib/elevenlabs-restaurant-agent-profile";
import { syncRoalElevenLabsTools } from "@/lib/sync-elevenlabs-roal-tools";

export type ConnectElevenLabsAgentInput = {
  agentId: string;
  restaurantId: string;
  restaurantName: string;
};

/** Sync ROAL tools + apply order-taker profile; ties agent defaults to this restaurant. */
export async function connectElevenLabsAgentToRestaurantAction(
  input: ConnectElevenLabsAgentInput
) {
  const agentId = input?.agentId?.trim() ?? "";
  const restaurantId = input?.restaurantId?.trim() ?? "";
  const restaurantName = (input?.restaurantName ?? "").trim();

  if (!agentId) {
    throw new Error("Enter an ElevenLabs agent id.");
  }
  if (!restaurantId) {
    throw new Error("Missing restaurant on this page. Reload and try again.");
  }

  const sync = await syncRoalElevenLabsTools({
    agentId,
    restaurantId,
    restaurantName,
  });
  const profile = await applyRestaurantOrderAgentProfile({
    agentId,
    restaurantId,
    restaurantName,
  });

  return { sync, profile };
}
