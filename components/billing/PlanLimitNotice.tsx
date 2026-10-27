import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SerializableGateVerdict } from "@/lib/billing/gates";

type Props = {
  verdict: SerializableGateVerdict | null | undefined;
  className?: string;
};

export function PlanLimitNotice({ verdict, className }: Props) {
  if (!verdict || verdict.level === "ok" || !verdict.message) {
    return null;
  }

  const blocked = verdict.hardBlocked;

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2.5 rounded-[12px] border px-3.5 py-3 text-[13px]",
        blocked ? "border-warning/30 bg-warning/5 text-ink" : "border-line bg-card text-muted",
        className
      )}
      role="status"
    >
      {blocked ? (
        <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-warning" aria-hidden />
      ) : (
        <Info size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-subtle" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
      <p className="font-semibold text-ink">{verdict.title}</p>
      <p className="mt-0.5 text-pretty leading-relaxed">{verdict.message}</p>
      {verdict.showUpgrade ? (
        <p className="mt-1.5">
          <Link
            href={verdict.upgradeHref}
            className="font-medium text-ink underline underline-offset-2"
          >
            View plans &amp; usage
          </Link>
        </p>
      ) : null}
      </div>
    </div>
  );
}
