import Link from "next/link";

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
  primaryLabel = "Open restaurants",
  secondaryHref,
  secondaryLabel,
}: Props) {
  return (
    <div className="mx-auto max-w-2xl min-w-0">
      <p className="type-eyebrow text-accent">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 text-pretty text-sm leading-relaxed text-muted sm:text-base">
        {description}
      </p>

      <ul className="mt-8 space-y-3">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex gap-3 rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted"
          >
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              aria-hidden
            />
            <span className="min-w-0 break-words text-pretty">{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link href={primaryHref} className="btn-primary min-h-11 justify-center px-5">
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="btn-ghost min-h-11 justify-center px-5">
            {secondaryLabel}
          </Link>
        ) : null}
      </div>

      <p className="mt-6 text-pretty text-xs text-subtle">
        More controls ship in upcoming releases—use Locations or Support if you need
        help today.
      </p>
    </div>
  );
}
