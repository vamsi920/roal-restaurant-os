import Link from "next/link";
import { StatusChip } from "@/components/dashboard/page-primitives";
import { cn } from "@/lib/cn";
import type { OnboardingReadinessSnapshot } from "@/lib/onboarding/readiness";

type Props = {
  readiness: OnboardingReadinessSnapshot;
  compact?: boolean;
  className?: string;
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn("mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full", ok ? "bg-success" : "bg-line-strong")}
      aria-hidden
    />
  );
}

/** Real readiness for one location — compact sidebar list, no demo data. */
export function OnboardingReadinessPanel({ readiness, compact = false, className }: Props) {
  return (
    <section
      className={cn("onboarding-readiness dashboard-panel", className)}
      aria-label="Setup readiness"
    >
      <div className="dashboard-panel__head">
        <h2 className="dashboard-page__section-title">Readiness</h2>
        <StatusChip
          tone={readiness.isPhoneAgentReady ? "ok" : readiness.isCoreReady ? "warn" : "neutral"}
        >
          {readiness.isPhoneAgentReady ? "Ready" : readiness.isCoreReady ? "Almost" : "In progress"}
        </StatusChip>
      </div>
      <ul className="mt-2.5 space-y-1">
        {readiness.items.map((item) => {
          const body = (
            <>
              <StatusDot ok={item.ok} />
              <span className="min-w-0">
                <span className={cn("block text-[13px]", item.ok ? "text-muted" : "font-medium text-ink")}>
                  {item.label}
                </span>
                {!item.ok || !compact ? (
                  <span className="block text-[12px] text-muted [overflow-wrap:anywhere]">
                    {item.detail}
                  </span>
                ) : null}
              </span>
            </>
          );
          return (
            <li key={item.state}>
              {item.href && !item.ok ? (
                <Link
                  href={item.href}
                  className="-mx-1.5 flex gap-2 rounded-md px-1.5 py-1 hover:bg-elev"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex gap-2 py-1">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
