import type { LandingPreviewData } from "@/lib/landing-demo-data";
import { PhoneOrdersPreview } from "./phone-orders-preview";
import { PreviewFrame } from "./shared";

/** Phone orders panel only — for feature row. */
export function KdsFeaturePreview({
  data,
  embedded,
  tone = "default",
}: {
  data: LandingPreviewData;
  embedded?: boolean;
  tone?: "default" | "glass";
}) {
  return (
    <PreviewFrame embedded={embedded}>
      <PhoneOrdersPreview data={data} tone={tone} />
    </PreviewFrame>
  );
}
