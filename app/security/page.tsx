import Link from "next/link";
import { Building2, FileClock, Hand, KeyRound, ShieldCheck, UserRoundCheck } from "lucide-react";
import { FaqList } from "@/components/landing/faq-list";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { SECURITY_FAQ } from "@/lib/landing/launch-faq";
import { buildSecurityPageMetadata } from "@/lib/landing/security-metadata";

export const metadata = buildSecurityPageMetadata();

const PILLARS = [
  {
    title: "Scoped per restaurant",
    body: "Your menu, calls, and tickets live in your account. Other restaurants cannot see them, and staff sign in with their own logins.",
    Icon: Building2,
    tile: "blue",
  },
  {
    title: "Caller data, minimal",
    body: "Name and phone number for the pickup, stored with the ticket. No card numbers are taken over the phone. Caller data is not sold.",
    Icon: UserRoundCheck,
    tile: "green",
  },
  {
    title: "Human handoff",
    body: "Complaints, catering, allergies, and manager requests go to your team. The host does not invent an order to finish a call.",
    Icon: Hand,
    tile: "rose",
  },
  {
    title: "Verified orders only",
    body: "Tickets are created only from calls on your line, by your host, into your account. There is no public form that writes to your kitchen screen.",
    Icon: ShieldCheck,
    tile: "orange",
  },
  {
    title: "Everything is logged",
    body: "Each call keeps its transcript. Each ticket keeps its status history. You can reconstruct a busy night after the fact.",
    Icon: FileClock,
    tile: "amber",
  },
  {
    title: "You stay in control",
    body: "Forward your number when you are ready, and point it back any time from your carrier. Delete your account and its data by emailing us.",
    Icon: KeyRound,
    tile: "ink",
  },
] as const;

export default function SecurityPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Security"
        title={
          <>
            <span className="tone-muted">Caller data stays yours.</span> Your team stays in charge.
          </>
        }
        lead="ROAL handles two kinds of information: your menu and your callers' pickup details. Here is what we do with each, in plain language."
      >
        <Link href="/privacy" className="btn-ghost btn-lg">
          Read the privacy policy
        </Link>
      </PageHero>

      <section className="section !pt-4">
        <div className="wrap">
          <div className="feature-grid feature-grid--3">
            {PILLARS.map(({ title, body, Icon, tile }) => (
              <div key={title} className="feature reveal">
                <span className={`icon-tile icon-tile--lg icon-tile--${tile}`} aria-hidden>
                  <Icon className="h-5 w-5" />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="security-tech">
        <div className="wrap">
          <div className="prose-card reveal">
            <div className="prose mx-auto">
              <p className="pill">
                <span className="pill__dot" aria-hidden />
                For your tech person
              </p>
              <h2 id="security-tech" className="h2 !mt-5 !text-[clamp(1.75rem,4vw,2.25rem)]">
                Implementation notes
              </h2>
              <ul className="mt-4">
                <li>
                  <strong>Database access is row-scoped per organization.</strong> Application code reads and writes through policies tied to the signed-in user; privileged service access is limited to server-side functions.
                </li>
                <li>
                  <strong>Voice tools are signed per restaurant.</strong> The phone host can only create or finalize orders for the restaurant it was provisioned for, using a per-restaurant credential that never ships to the browser.
                </li>
                <li>
                  <strong>Sessions use standard email and password auth</strong> with confirmation links and password reset. Staff accounts are per person, not per device.
                </li>
                <li>
                  <strong>Audit data is append-only in practice:</strong> call transcripts, cart drafts, and ticket status changes are retained for review.
                </li>
              </ul>
              <p className="mt-6">
                Need a security questionnaire filled in, or details on data retention? Email{" "}
                <a href={`mailto:${CONTACT_PILOT_EMAIL}`}>{CONTACT_PILOT_EMAIL}</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="security-faq">
        <div className="wrap">
          <div className="faq-layout">
            <div className="reveal min-w-0">
              <p className="pill">
                <span className="pill__dot" aria-hidden />
                FAQ
              </p>
              <h2 id="security-faq" className="h2 mt-5">
                <span className="tone-muted">Security questions</span> owners ask
              </h2>
            </div>
            <div className="reveal min-w-0">
              <FaqList items={SECURITY_FAQ} />
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
