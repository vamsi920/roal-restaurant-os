import Link from "next/link";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-line/90 bg-base/85 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex min-h-14 max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:h-14 sm:px-6 sm:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link href="/dashboard/restaurants" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <LogoMark />
              <div className="flex min-w-0 items-baseline gap-1.5 sm:gap-2">
                <span className="truncate text-[14px] font-semibold tracking-tight sm:text-[15px]">ROAL</span>
                <span className="hidden shrink-0 text-[11px] uppercase tracking-[0.18em] text-subtle md:inline">
                  Restaurant OS
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Link
              href="/dashboard/restaurants"
              className="rounded-md px-2.5 py-2 text-[12px] text-muted transition-colors hover:bg-elev hover:text-ink sm:px-3 sm:text-[13px]"
            >
              Restaurants
            </Link>
            <div className="ml-1 flex items-center gap-1.5 rounded-md border border-line bg-elev px-2 py-1 sm:ml-2 sm:gap-2 sm:px-2.5">
              <span className="pulse-dot" />
              <span className="hidden text-[11px] font-medium uppercase tracking-wider text-muted sm:inline">
                Realtime
              </span>
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-8 sm:pt-8">
        {children}
      </main>
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
