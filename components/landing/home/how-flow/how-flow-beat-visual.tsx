import type { HowFlowBeatId } from "@/lib/landing/home-how-flow-copy";
import type { getHowFlowVisualData } from "@/lib/landing/home-how-flow-data";
import { HowFlowConnectVisual } from "./how-flow-connect-visual";
import { HowFlowOrderVisual } from "./how-flow-order-visual";
import { HowFlowScanVisual } from "./how-flow-scan-visual";

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
      {beatId === "share-menu" ? <HowFlowScanVisual model={visuals.scan} /> : null}
      {beatId === "connect-line" ? <HowFlowConnectVisual /> : null}
      {beatId === "kitchen-orders" ? (
        <HowFlowOrderVisual lines={visuals.orderLines} ticket={visuals.ticket} />
      ) : null}
    </div>
  );
}
