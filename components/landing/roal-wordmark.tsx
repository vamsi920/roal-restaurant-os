import { RoalMark } from "@/components/brand/roal-mark";
import { cn } from "@/lib/cn";

/** Logo lockup: ROAL mark + "ROAL" text. Used by the public nav and footer. */
export function RoalWordmark({ className, tone = "ink" }: { className?: string; tone?: "ink" | "paper" }) {
  return (
    <span className={cn("roal-wordmark", tone === "paper" && "roal-wordmark--paper", className)}>
      <RoalMark size={28} />
      <span className="roal-wordmark__text">ROAL</span>
    </span>
  );
}
