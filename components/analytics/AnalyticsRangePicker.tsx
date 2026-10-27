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
      className="analytics-range-picker seg flex w-full sm:inline-flex sm:w-auto"
      role="group"
      aria-label="Date range"
    >
      {OPTIONS.map((opt) => (
        <Link
          key={opt.key}
          href={`${pathname}?range=${opt.key}`}
          aria-current={active === opt.key ? "true" : undefined}
          className={cn(
            "!h-auto min-h-11 flex-1 justify-center transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 sm:min-h-7 sm:flex-initial",
            active === opt.key && "is-active"
          )}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
