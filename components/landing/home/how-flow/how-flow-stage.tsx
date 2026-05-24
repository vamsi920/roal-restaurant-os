import { HOME_HOW_FLOW, type HowFlowBeatId } from "@/lib/landing/home-how-flow-copy";
import type { getHowFlowVisualData } from "@/lib/landing/home-how-flow-data";
import { HowFlowOrderVisual } from "./how-flow-order-visual";
import { HowFlowRoalVisual } from "./how-flow-roal-visual";
import { HowFlowScanVisual } from "./how-flow-scan-visual";
import { HowFlowTicketVisual } from "./how-flow-ticket-visual";

type VisualData = ReturnType<typeof getHowFlowVisualData>;

type Props = {
  activeBeat: HowFlowBeatId;
  visuals: VisualData;
  label: string;
  /** Live region only when scroll-synced desktop stage is active. */
  announceChanges?: boolean;
};

export const HOW_FLOW_BEAT_ORDER: HowFlowBeatId[] = [
  "scan-menu",
  "roal-answers",
  "guest-orders",
  "ticket-lands",
];

function StagePane({
  beatId,
  activeBeat,
  visuals,
}: {
  beatId: HowFlowBeatId;
  activeBeat: HowFlowBeatId;
  visuals: VisualData;
}) {
  const isActive = activeBeat === beatId;

  return (
    <div
      className={`home-how-flow__stage-pane${isActive ? " is-active" : ""}`}
      data-beat={beatId}
      aria-hidden={!isActive}
    >
      {beatId === "scan-menu" ? <HowFlowScanVisual model={visuals.scan} /> : null}
      {beatId === "roal-answers" ? <HowFlowRoalVisual greeting={visuals.roalGreeting} /> : null}
      {beatId === "guest-orders" ? (
        <HowFlowOrderVisual lines={visuals.orderLines} ticket={visuals.ticket} />
      ) : null}
      {beatId === "ticket-lands" ? <HowFlowTicketVisual model={visuals.ticket} /> : null}
    </div>
  );
}

export function HowFlowStage({
  activeBeat,
  visuals,
  label,
  announceChanges = false,
}: Props) {
  const activeTitle =
    HOME_HOW_FLOW.beats.find((beat) => beat.id === activeBeat)?.title ?? "";

  return (
    <div
      className="home-how-flow__stage home-glass-panel"
      aria-live={announceChanges ? "polite" : undefined}
      aria-atomic={announceChanges ? true : undefined}
    >
      <p className="home-how-visual__label">{label}</p>
      <span className="sr-only">Showing: {activeTitle}</span>
      <div className="home-how-flow__stage-panes">
        {HOW_FLOW_BEAT_ORDER.map((beatId) => (
          <StagePane
            key={beatId}
            beatId={beatId}
            activeBeat={activeBeat}
            visuals={visuals}
          />
        ))}
      </div>
    </div>
  );
}
