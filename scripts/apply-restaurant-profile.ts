import { applyRestaurantOrderAgentProfile } from "../lib/elevenlabs-restaurant-agent-profile";

void (async () => {
  const r = await applyRestaurantOrderAgentProfile();
  console.log(JSON.stringify(r, null, 2));
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
