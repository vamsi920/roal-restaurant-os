import Link from "next/link";
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
  },
  {
    title: "Caller data, minimal",
    body: "Name and phone number for the pickup, stored with the ticket. No card numbers are taken over the phone. Caller data is not sold.",
  },
  {
    title: "Human handoff",
    body: "Complaints, catering, allergies, and manager requests go to your team. The host does not invent an order to finish a call.",
  },
  {
    title: "Verified orders only",
    body: "Tickets are created only from calls on your line, by your host, into your account. There is no public form that writes to your kitchen screen.",
  },
  {
    title: "Everything is logged",
    body: "Each call keeps its transcript. Each ticket keeps its status history. You can reconstruct a busy night after the fact.",
  },
  {
    title: "You stay in control",
    body: "Forward your number when you are ready, and point it back any time from your carrier. Delete your account and its data by emailing us.",
  },
] as const;

export default function SecurityPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Security"
        title="Caller data stays yours. Your team stays in charge."
        lead="ROAL handles two kinds of information: your menu and your callers' pickup details. Here is what we do with each, in plain language."
      >
        <Link href="/privacy" className="btn-ghost btn-lg">
          Read the privacy policy
        </Link>
      </PageHero>

      <section className="section">
        <div className="wrap">
          <div className="feature-grid feature-grid--3 reveal">
            {PILLARS.map((p) => (
              <div key={p.title} className="card feature">
                <span className="feature__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3Z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="security-tech">
        <div className="wrap">
          <div className="prose reveal">
            <p className="eyebrow">For your tech person</p>
            <h2 id="security-tech" className="h2 mt-3">
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
      </section>

      <section className="section" aria-labelledby="security-faq">
        <div className="wrap">
          <div className="grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-12">
            <div className="reveal min-w-0">
              <p className="eyebrow">FAQ</p>
              <h2 id="security-faq" className="h2 mt-3">
                Security questions owners ask
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
