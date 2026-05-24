import Link from "next/link";
import { DASHBOARD_NAV } from "@/lib/dashboard-nav";

const QUICK = [
  {
    href: "/dashboard/restaurants",
    title: "Restaurants",
    body: "Open a location, scan menus, run the KDS, and connect voice.",
  },
  {
    href: "/dashboard/onboarding",
    title: "Onboarding",
    body: "Track setup from first login through test call and go-live.",
  },
  {
    href: "/dashboard/analytics",
    title: "Analytics",
    body: "Phone orders, conversion, and menu scan success over time.",
  },
] as const;

export default function DashboardOverviewPage() {
  return (
    <div className="min-w-0 space-y-8">
      <header className="max-w-2xl min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">
          Overview
        </p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Restaurant operating system
        </h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted sm:text-base">
          Run pickup phone orders with a live menu, kitchen display, and voice agent.
          Open Restaurants to manage a location, or Onboarding for a guided setup.
        </p>
      </header>

      <section aria-labelledby="quick-heading">
        <h2 id="quick-heading" className="text-sm font-semibold text-ink">
          Quick access
        </h2>
        <ul className="mt-3 grid min-w-0 gap-3 sm:grid-cols-3">
          {QUICK.map((card) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="glass-card block h-full min-w-0 p-4 transition-colors hover:border-line-strong sm:p-5"
              >
                <h3 className="font-semibold text-ink">{card.title}</h3>
                <p className="mt-2 break-words text-pretty text-sm text-muted">
                  {card.body}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="workspace-heading">
        <h2 id="workspace-heading" className="text-sm font-semibold text-ink">
          Workspace
        </h2>
        <ul className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DASHBOARD_NAV.flatMap((g) =>
            g.items
              .filter((i) => i.href !== "/dashboard")
              .map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-line bg-card px-3 py-2.5 text-sm transition-colors hover:bg-elev"
                  >
                    <span className="truncate font-medium text-ink">{item.label}</span>
                    {item.badge ? (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-subtle">
                        {item.badge}
                      </span>
                    ) : (
                      <span className="shrink-0 text-subtle" aria-hidden>
                        →
                      </span>
                    )}
                  </Link>
                </li>
              ))
          )}
        </ul>
      </section>
    </div>
  );
}
