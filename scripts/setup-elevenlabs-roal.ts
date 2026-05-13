import { applyRestaurantOrderAgentProfile } from "../lib/elevenlabs-restaurant-agent-profile";
import { syncRoalElevenLabsTools } from "../lib/sync-elevenlabs-roal-tools";

void (async () => {
  const rid = process.env.ROAL_SYNC_RESTAURANT_ID?.trim();
  const rname = process.env.ROAL_SYNC_RESTAURANT_NAME?.trim() ?? "";
  const restaurant = rid ? { restaurantId: rid, restaurantName: rname } : {};
  const tools = await syncRoalElevenLabsTools(restaurant);
  const profile = await applyRestaurantOrderAgentProfile(restaurant);
  console.log(
    JSON.stringify(
      { tools: tools.tools, profile },
      null,
      2
    )
  );
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
