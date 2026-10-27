import Link from "next/link";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-primitives";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: readonly string[];
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function DashboardPlaceholderPage({
  eyebrow,
  title,
  description,
  bullets,
  primaryHref = "/dashboard/restaurants",
  primaryLabel = "Open locations",
  secondaryHref,
  secondaryLabel,
}: Props) {
  return (
    <div className="org-page org-page--narrow min-w-0 space-y-5">
      <PageHeader eyebrow={eyebrow} title={title} lead={description} />

      <ul className="panel">
        {bullets.map((b) => (
          <li key={b} className="list-row items-start text-[13px] text-muted hover:bg-transparent">
            <span
              className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"
              aria-hidden
            >
              <Check size={11} strokeWidth={3} />
            </span>
            <span className="min-w-0 text-pretty [overflow-wrap:anywhere]">{b}</span>
          </li>
        ))}
      </ul>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Link href={primaryHref} className="btn-primary">
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="btn-ghost">
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
