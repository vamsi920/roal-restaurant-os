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
      className="inline-flex rounded-lg border border-line bg-elev p-0.5"
      role="group"
      aria-label="Date range"
    >
      {OPTIONS.map((opt) => (
        <Link
          key={opt.key}
          href={`${pathname}?range=${opt.key}`}
          className={cn(
            "inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
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
