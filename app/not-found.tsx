import Link from "next/link";
import { MarketingShell } from "@/components/landing/marketing-shell";

export default function NotFound() {
  return (
    <MarketingShell>
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
          404
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ink">
          Page not found
        </h1>
        <p className="mt-3 text-pretty text-sm text-muted">
          This link may be outdated or mistyped. Head back to the home page or
          sign in to your dashboard.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="public-btn-primary min-h-11 justify-center px-5">
            Home
          </Link>
          <Link href="/login" className="public-btn-ghost min-h-11 justify-center px-5">
            Sign in
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
