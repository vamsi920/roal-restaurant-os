import type { LandingPreviewData } from "@/lib/landing-demo-data";
import { DemoCallFlowSection } from "./demo-call-simulation";
import { DemoCtaBand } from "./demo-cta-band";
import { DemoProofSection } from "./demo-proof-section";
import { DemoVideoPlaceholder } from "./demo-video-placeholder";

type Props = {
  preview: LandingPreviewData;
};

/** One-page demo: video → 3 steps → transcript + ticket → CTA. */
export function DemoPageContent({ preview }: Props) {
  return (
    <div className="public-demo-page landing-wrap landing-wrap-tight min-w-0 overflow-x-clip">
      <DemoVideoPlaceholder />
      <DemoCallFlowSection />
      <DemoProofSection preview={preview} />
      <DemoCtaBand />
    </div>
  );
}
