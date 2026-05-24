import type { HowFlowBeatId } from "@/lib/landing/home-how-flow-copy";
import type { getHowFlowVisualData } from "@/lib/landing/home-how-flow-data";
import { HowFlowOrderVisual } from "./how-flow-order-visual";
import { HowFlowRoalVisual } from "./how-flow-roal-visual";
import { HowFlowScanVisual } from "./how-flow-scan-visual";
import { HowFlowTicketVisual } from "./how-flow-ticket-visual";

type VisualData = ReturnType<typeof getHowFlowVisualData>;

type Props = {
  beatId: HowFlowBeatId;
  visuals: VisualData;
  label: string;
};

export function HowFlowBeatVisual({ beatId, visuals, label }: Props) {
  return (
    <div className="home-how-flow__step-visual home-glass-panel">
      <p className="home-how-visual__label">{label}</p>
      {beatId === "scan-menu" ? <HowFlowScanVisual model={visuals.scan} /> : null}
      {beatId === "roal-answers" ? <HowFlowRoalVisual greeting={visuals.roalGreeting} /> : null}
      {beatId === "guest-orders" ? (
        <HowFlowOrderVisual lines={visuals.orderLines} ticket={visuals.ticket} />
      ) : null}
      {beatId === "ticket-lands" ? <HowFlowTicketVisual model={visuals.ticket} /> : null}
    </div>
  );
}
