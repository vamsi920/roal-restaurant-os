import { AGENT_CONVERSATION_DEMO } from "@/lib/landing/agent-conversation-demo";
import { LANDING_DEMO } from "@/lib/landing-demo-data";
import { buildKitchenTicketPreview } from "@/lib/landing/build-kitchen-ticket-preview";
import { buildMenuScanPreview } from "@/lib/landing/build-menu-scan-preview";

const ORDER_LINE_IDS = ["2", "3", "4", "5", "7"] as const;

/** Static demo payloads for homepage scroll story visuals. */
export function getHowFlowVisualData() {
  const lines = AGENT_CONVERSATION_DEMO.lines.filter((line) => line.speaker !== "system");

  return {
    scan: buildMenuScanPreview(LANDING_DEMO),
    ticket: buildKitchenTicketPreview(LANDING_DEMO),
    roalGreeting: lines.slice(0, 1),
    orderLines: lines.filter((line) =>
      (ORDER_LINE_IDS as readonly string[]).includes(line.id)
    ),
  };
}
