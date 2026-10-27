import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { buildTermsPageMetadata } from "@/lib/landing/legal-metadata";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

export const metadata = buildTermsPageMetadata();

export default function TermsPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Legal"
        title="Terms of service"
        lead="The short version: you pay per completed phone order, you can stop any time, and you are responsible for what is on your menu. This page is not legal advice."
      />
      <section className="section !pt-2">
        <div className="wrap">
          <div className="prose-card">
            <div className="prose mx-auto">
              <p className="prose__updated">Last updated: October 2026</p>

              <h2>The service</h2>
              <p>
                ROAL provides an AI phone host that answers calls forwarded to a
                phone line we provide, takes pickup orders from the menu you
                configure, answers questions from the information you provide,
                and sends order tickets to your dashboard.
              </p>

              <h2>Price</h2>
              <p>
                {PRICING_RATE_AMOUNT} per completed phone order. An order is
                completed when the caller confirms their name, phone number, and
                items and the ticket is delivered to your account. There is no
                monthly fee, no setup fee, and no per-minute fee. Calls that do
                not produce a ticket are free. If you void a ticket in good
                faith, tell us and we will credit it. If we change the price, we
                will tell you in advance by email.
              </p>

              <h2>No contract</h2>
              <p>
                There is no minimum term. Stop using ROAL by pointing your phone
                number back to your own line. You can ask us to delete your
                account at any time.
              </p>

              <h2>Your responsibilities</h2>
              <ul>
                <li>
                  Keep your menu, prices, and hours accurate. The host repeats
                  what you configure.
                </li>
                <li>
                  Tell callers that calls may be recorded where your local law
                  requires it. Recording can be turned off.
                </li>
                <li>
                  Review tickets as they arrive. ROAL takes the order; your
                  kitchen makes it.
                </li>
                <li>
                  Use the service only for your own restaurant and only for
                  lawful purposes.
                </li>
              </ul>

              <h2>What we do not promise</h2>
              <p>
                The host can make mistakes, and phone networks can fail. We work
                to keep it accurate and available, but we do not guarantee that
                every call will be answered or every order will be correct. Our
                liability to you is limited to the fees you paid us in the three
                months before the issue.
              </p>

              <h2>Trial hosts</h2>
              <p>
                Hosts built from a link without an account are for evaluation
                only, may be removed at any time, and are not connected to a
                phone number until you claim them.
              </p>

              <h2>Changes</h2>
              <p>
                We may update these terms. Material changes will be announced by
                email to account holders before they take effect.
              </p>

              <h2>Contact</h2>
              <p>
                Questions about these terms:{" "}
                <a href={`mailto:${CONTACT_PILOT_EMAIL}`}>
                  {CONTACT_PILOT_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
