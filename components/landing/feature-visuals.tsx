import type { LandingPreviewData } from "@/lib/landing-demo-data";
import { KdsFeaturePreview } from "./preview/kds-feature-preview";
import { MenuScannerPreview } from "./preview/menu-scanner-preview";

export function MenuScanVisual({ data }: { data: LandingPreviewData }) {
  return <MenuScannerPreview data={data} />;
}

export function KdsVisual({
  data,
  embedded,
  tone = "default",
}: {
  data: LandingPreviewData;
  embedded?: boolean;
  tone?: "default" | "glass";
}) {
  return <KdsFeaturePreview data={data} embedded={embedded} tone={tone} />;
}
