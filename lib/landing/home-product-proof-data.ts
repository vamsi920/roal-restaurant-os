import { AGENT_CONVERSATION_DEMO } from "@/lib/landing/agent-conversation-demo";
import { LANDING_DEMO } from "@/lib/landing-demo-data";
import { buildKitchenTicketPreview } from "@/lib/landing/build-kitchen-ticket-preview";

const PROOF_LINE_IDS = new Set(["2", "4", "8"]);

/** Static demo — mirrors how-flow / KDS preview payloads. */
export function getHomeProductProofData() {
  return {
    restaurantName: LANDING_DEMO.restaurantName,
    scenario: AGENT_CONVERSATION_DEMO.scenario,
    conversation: AGENT_CONVERSATION_DEMO.lines.filter((line) => PROOF_LINE_IDS.has(line.id)),
    ticket: buildKitchenTicketPreview(LANDING_DEMO),
  };
}
