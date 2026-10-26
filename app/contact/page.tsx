import Link from "next/link";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { buildPilotMailto, CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { buildContactPageMetadata } from "@/lib/landing/contact-metadata";

export const metadata = buildContactPageMetadata();

const REASONS = [
  {
    title: "Volume pricing",
    body: "Doing a lot of phone orders? Tell us roughly how many a week and we will confirm a rate before you go live.",
    subject: "ROAL — volume pricing",
  },
  {
    title: "Going live",
    body: "Stuck on call forwarding, or want someone to walk through a test call with you? Ask.",
    subject: "ROAL — help going live",
  },
  {
    title: "Something went wrong",
    body: "The host said the wrong thing, missed an item, or misread your menu. Send the transcript and we will look.",
    subject: "ROAL — issue on a call",
  },
  {
    title: "Multiple locations",
    body: "Each location gets its own host and line. Tell us how many and we will set them up with you.",
    subject: "ROAL — multiple locations",
  },
] as const;

export default function ContactPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Contact"
        title="Email us. A person replies."
        lead="No sales queue and no chatbot on this page. Write to the address below and we will get back to you."
      />

      <section className="section">
        <div className="wrap">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10">
            <div className="card contact-card reveal min-w-0">
              <p className="eyebrow">Email</p>
              <a href={buildPilotMailto()} className="contact-card__email">
                {CONTACT_PILOT_EMAIL}
              </a>
              <p className="mt-4 text-sm text-muted">
                Include your restaurant name and city so we can pull up your host if you already built one.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={buildPilotMailto({ subject: "ROAL — question from a restaurant" })} className="btn-primary btn-lg">
                  Open email
                </a>
                <Link href="/try" className="btn-ghost btn-lg">
                  Try it first
                </Link>
              </div>
            </div>
            <div className="grid gap-4 reveal min-w-0">
              {REASONS.map((r) => (
                <a key={r.title} href={buildPilotMailto({ subject: r.subject })} className="card feature block transition hover:border-line-strong">
                  <h3>{r.title}</h3>
                  <p>{r.body}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
