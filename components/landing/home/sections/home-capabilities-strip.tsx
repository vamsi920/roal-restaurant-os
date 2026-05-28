import { PublicMetricsStrip } from "@/components/landing/public";
import { HOME_CAPABILITIES } from "@/lib/landing/home-capabilities-copy";

export function HomeCapabilitiesStrip() {
  const { eyebrow, title, note, items } = HOME_CAPABILITIES;

  return (
    <PublicMetricsStrip
      shell="home"
      eyebrow={eyebrow}
      title={title}
      titleVisuallyHidden
      note={note}
      items={items}
    />
  );
}
