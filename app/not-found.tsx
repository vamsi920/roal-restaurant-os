import Link from "next/link";
import { SiteShell } from "@/components/landing/site-shell";

export default function NotFound() {
  return (
    <SiteShell>
      <section className="wrap">
        <div className="notfound">
          <p className="notfound__code" aria-hidden>
            4<span>0</span>4
          </p>
          <h1 className="h2 mt-6">That page isn&apos;t on the menu.</h1>
          <p className="lead mt-4 max-w-md">The link may be old or mistyped. Head home, or try your own phone host.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="btn-primary btn-lg">
              Back to home
            </Link>
            <Link href="/try" className="btn-ghost btn-lg">
              Try it free
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
