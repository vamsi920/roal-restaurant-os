import Link from "next/link";
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
    <div className="dashboard-page dashboard-page--narrow min-w-0 space-y-5">
      <PageHeader eyebrow={eyebrow} title={title} lead={description} />

      <ul className="card divide-y divide-line/70 px-4">
        {bullets.map((b) => (
          <li key={b} className="flex gap-3 py-2.5 text-[13px] text-muted">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span className="min-w-0 text-pretty [overflow-wrap:anywhere]">{b}</span>
          </li>
        ))}
      </ul>

      <div className="dashboard-page__actions dashboard-page__actions--row">
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
