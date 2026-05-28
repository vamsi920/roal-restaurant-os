import { cn } from "@/lib/cn";

type Props = {
  /** `canvas` = fixed full-page wash; `hero` = section band only. */
  variant?: "canvas" | "hero";
  className?: string;
};

/** Lavender / ink wash — same tokens as marketing shell (no video). */
export function PublicBackgroundWash({ variant = "canvas", className }: Props) {
  return (
    <div
      className={cn(
        variant === "hero" ? "public-bg-wash-layer--hero" : "public-bg-wash-layer",
        className
      )}
      aria-hidden
    />
  );
}
