import { cn } from "@/lib/cn";

/**
 * ROAL mark: ink tile, open white ring (the plate / the "O"), ember dot in the gap (a live call).
 * Keep in sync with public/icons/roal-app-icon.svg.
 */
export function RoalMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
      focusable="false"
    >
      <rect width="32" height="32" rx="9" fill="#111111" />
      <path
        d="M23.97 16.7A8 8 0 1 1 16.7 8.03"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="21.66" cy="10.34" r="2.6" fill="#EA580C" />
    </svg>
  );
}
