"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { AnalyticsRangeKey } from "@/lib/analytics/types";

const OPTIONS: { key: AnalyticsRangeKey; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

export function AnalyticsRangePicker({ active }: { active: AnalyticsRangeKey }) {
  const pathname = usePathname();

  return (
    <div
      className="analytics-range-picker flex w-full rounded-lg border border-line bg-elev p-0.5 sm:inline-flex sm:w-auto"
      role="group"
      aria-label="Date range"
    >
      {OPTIONS.map((opt) => (
        <Link
          key={opt.key}
          href={`${pathname}?range=${opt.key}`}
          className={cn(
            "inline-flex min-h-11 flex-1 items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-initial",
            active === opt.key
              ? "bg-card text-ink shadow-sm"
              : "text-muted hover:text-ink"
          )}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
