import Link from "next/link";
import { cn } from "@/lib/cn";
import type { OnboardingReadinessSnapshot } from "@/lib/onboarding/readiness";

type Props = {
  readiness: OnboardingReadinessSnapshot;
  compact?: boolean;
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "mt-1 h-2 w-2 shrink-0 rounded-full",
        ok ? "bg-success" : "bg-line"
      )}
      aria-hidden
    />
  );
}

export function OnboardingReadinessPanel({ readiness, compact = false }: Props) {
  return (
    <section
      className="onboarding-readiness rounded-xl border border-line bg-card p-3"
      aria-label="Setup readiness"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-ink">Readiness</p>
          {!compact ? (
            <p className="mt-0.5 text-xs text-muted">
              Real status for this location — no demo data.
            </p>
          ) : null}
        </div>
        <p
          className={cn(
            "text-xs font-medium",
            readiness.isPhoneAgentReady ? "text-success" : "text-muted"
          )}
        >
          {readiness.isPhoneAgentReady
            ? "Ready"
            : readiness.isCoreReady
              ? "Almost ready"
              : "In progress"}
        </p>
      </div>
      <ul className="mt-2 space-y-1.5">
        {readiness.items.map((item) => (
          <li key={item.state}>
            {item.href && !item.ok ? (
              <Link
                href={item.href}
                className="flex gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-elev/80"
              >
                <StatusDot ok={item.ok} />
                <span className="min-w-0">
                  <span className="font-medium text-ink">{item.label}</span>
                  <span className="mt-0.5 block text-muted [overflow-wrap:anywhere]">
                    {item.detail}
                  </span>
                </span>
              </Link>
            ) : (
              <div className="flex gap-2 px-1 py-0.5 text-xs">
                <StatusDot ok={item.ok} />
                <span className="min-w-0">
                  <span
                    className={cn(
                      "font-medium",
                      item.ok ? "text-muted" : "text-ink"
                    )}
                  >
                    {item.label}
                  </span>
                  {!item.ok || !compact ? (
                    <span className="mt-0.5 block text-muted [overflow-wrap:anywhere]">
                      {item.detail}
                    </span>
                  ) : null}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
