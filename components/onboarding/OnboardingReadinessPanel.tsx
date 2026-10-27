import Link from "next/link";
import { Check } from "lucide-react";
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
      className={cn(
        "mt-[3px] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full",
        ok ? "bg-success text-white" : "border border-line-strong bg-card"
      )}
      aria-hidden
    >
      {ok ? <Check size={9} strokeWidth={3.5} /> : null}
    </span>
  );
}

/** Real readiness for one location — compact sidebar list, no demo data. */
export function OnboardingReadinessPanel({ readiness, compact = false, className }: Props) {
  return (
    <section
      className={cn("onboarding-readiness panel", className)}
      aria-label="Setup readiness"
    >
      <div className="panel__head">
        <h2 className="panel__title">Readiness</h2>
        <StatusChip
          tone={readiness.isPhoneAgentReady ? "ok" : readiness.isCoreReady ? "warn" : "neutral"}
        >
          {readiness.isPhoneAgentReady ? "Ready" : readiness.isCoreReady ? "Almost" : "In progress"}
        </StatusChip>
      </div>
      <ul className="space-y-0.5 px-3 py-2.5">
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
                  className="flex gap-2 rounded-lg px-1.5 py-1.5 hover:bg-elev focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex gap-2 px-1.5 py-1.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
