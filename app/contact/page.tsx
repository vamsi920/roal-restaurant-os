import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Building2, PhoneForwarded, Receipt } from "lucide-react";
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
    Icon: Receipt,
    tile: "orange",
  },
  {
    title: "Going live",
    body: "Stuck on call forwarding, or want someone to walk through a test call with you? Ask.",
    subject: "ROAL — help going live",
    Icon: PhoneForwarded,
    tile: "blue",
  },
  {
    title: "Something went wrong",
    body: "The host said the wrong thing, missed an item, or misread your menu. Send the transcript and we will look.",
    subject: "ROAL — issue on a call",
    Icon: AlertTriangle,
    tile: "rose",
  },
  {
    title: "Multiple locations",
    body: "Each location gets its own host and line. Tell us how many and we will set them up with you.",
    subject: "ROAL — multiple locations",
    Icon: Building2,
    tile: "green",
  },
] as const;

export default function ContactPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            <span className="tone-muted">Email us.</span> A person replies.
          </>
        }
        lead="No sales queue and no chatbot on this page. Write to the address below and we will get back to you."
      />

      <section className="section !pt-4">
        <div className="wrap">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6">
            <div className="contact-card reveal min-w-0">
              <p className="pill">
                <span className="pill__dot" aria-hidden />
                Email
              </p>
              <a href={buildPilotMailto()} className="contact-card__email mt-5 block">
                {CONTACT_PILOT_EMAIL}
              </a>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">
                Include your restaurant name and city so we can pull up your host if you already built one.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={buildPilotMailto({ subject: "ROAL — question from a restaurant" })} className="btn-primary btn-lg">
                  Open email
                </a>
                <Link href="/try" className="btn-ghost btn-lg">
                  Try it first
                </Link>
              </div>
            </div>
            <div className="grid gap-3 min-w-0">
              {REASONS.map(({ title, body, subject, Icon, tile }) => (
                <a key={title} href={buildPilotMailto({ subject })} className="feature feature--row reveal">
                  <span className={`icon-tile icon-tile--${tile}`} aria-hidden>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1.5">
                      {title}
                      <ArrowUpRight className="h-4 w-4 text-subtle" aria-hidden />
                    </h3>
                    <p>{body}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
