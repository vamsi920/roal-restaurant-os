import Link from "next/link";
import { SiteShell } from "@/components/landing/site-shell";

export default function NotFound() {
  return (
    <SiteShell>
      <section className="section">
        <div className="wrap">
          <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
            <p className="eyebrow">404</p>
            <h1 className="h1 mt-4">That page isn&apos;t on the menu.</h1>
            <p className="lead mt-4">The link may be old or mistyped. Head home, or try your own phone host.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/" className="btn-primary btn-lg">
                Home
              </Link>
              <Link href="/try" className="btn-ghost btn-lg">
                Try it free
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
