import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { buildPrivacyPageMetadata } from "@/lib/landing/legal-metadata";

export const metadata = buildPrivacyPageMetadata();

export default function PrivacyPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Legal"
        title="Privacy policy"
        lead="What ROAL collects, why, and how to reach us about it. Written in plain language. This page is not legal advice."
      />
      <section className="section">
        <div className="wrap">
          <div className="prose">
            <p className="prose__updated">Last updated: October 2026</p>

            <h2>Who this covers</h2>
            <p>
              Two groups of people: restaurants that use ROAL (&ldquo;you&rdquo;), and people who call a restaurant&apos;s
              phone line that ROAL answers (&ldquo;callers&rdquo;).
            </p>

            <h2>What we collect from restaurants</h2>
            <ul>
              <li>Account details: your email address and password (stored hashed by our auth provider).</li>
              <li>Restaurant details you give us or that we read from your public website or listing: name, address, hours, menu items and prices, and FAQs.</li>
              <li>Usage data needed to run the service: calls answered, tickets created, and billing records.</li>
            </ul>

            <h2>What we collect from callers</h2>
            <ul>
              <li>The caller&apos;s name and phone number, when they place a pickup order, so the restaurant can prepare it and reach them.</li>
              <li>A transcript and, where enabled by the restaurant, an audio recording of the call, so the restaurant can review what was ordered.</li>
              <li>We do not take payment card numbers over the phone.</li>
            </ul>

            <h2>How we use it</h2>
            <p>
              To answer the restaurant&apos;s phone, take and deliver orders, show the restaurant its own call and
              ticket history, bill the restaurant per completed order, and improve how the host handles calls for that restaurant.
              We do not sell caller data, and we do not use one restaurant&apos;s data to serve another restaurant.
            </p>

            <h2>Who else sees it</h2>
            <p>
              We use third-party infrastructure providers to host the service, run the voice and language models behind the phone host,
              and send email. They process data on our behalf under their own terms. We do not share caller data with advertisers.
            </p>

            <h2>Trial hosts built from a link</h2>
            <p>
              When you paste a restaurant link on our site without signing up, we read that restaurant&apos;s public pages to build a
              temporary host and keep it, plus any test-call transcripts, for a limited time. If you do not claim it, it is deleted.
            </p>

            <h2>Retention and deletion</h2>
            <p>
              We keep restaurant and caller data for as long as the restaurant has an account, plus whatever we need to keep
              for billing and legal records. Email us to delete your account and its data.
            </p>

            <h2>Contact</h2>
            <p>
              Privacy questions: <a href={`mailto:${CONTACT_PILOT_EMAIL}`}>{CONTACT_PILOT_EMAIL}</a>
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
