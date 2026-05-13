import Link from "next/link";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/90 bg-base/85 shadow-sm backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/restaurants" className="flex items-center gap-2.5">
              <LogoMark />
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-semibold tracking-tight">ROAL</span>
                <span className="hidden text-[11px] uppercase tracking-[0.18em] text-subtle md:inline">
                  Restaurant OS
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard/restaurants"
              className="rounded-md px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-elev hover:text-ink"
            >
              Restaurants
            </Link>
            <div className="ml-2 flex items-center gap-2 rounded-md border border-line bg-elev px-2.5 py-1">
              <span className="pulse-dot" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Realtime
              </span>
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 py-8">{children}</main>
    </div>
  );
}

function LogoMark() {
  return (
    <div className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-lg border border-line bg-card">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/18 via-transparent to-violet-500/12" />
      <svg
        viewBox="0 0 24 24"
        className="relative h-4 w-4 text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 4h6v6H4z" />
        <path d="M14 4h6v6h-6z" />
        <path d="M4 14h6v6H4z" />
        <path d="M14 14h6v6h-6z" />
      </svg>
    </div>
  );
}
