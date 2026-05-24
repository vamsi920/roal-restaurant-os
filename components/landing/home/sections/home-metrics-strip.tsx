import { PublicMetricsStrip } from "@/components/landing/public";
import { HOME_METRICS } from "@/lib/landing/home-metrics-copy";

export function HomeMetricsStrip() {
  const { eyebrow, note, items } = HOME_METRICS;

  return (
    <PublicMetricsStrip
      shell="home"
      eyebrow={eyebrow}
      titleVisuallyHidden
      note={note}
      items={items}
    />
  );
}
