import Link from "next/link";
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
        "rounded-md border px-3 py-2.5 text-[13px]",
        blocked ? "border-warning/30 bg-warning/5 text-ink" : "border-line bg-elev text-muted",
        className
      )}
      role="status"
    >
      <p className="font-medium text-ink">{verdict.title}</p>
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
  );
}
