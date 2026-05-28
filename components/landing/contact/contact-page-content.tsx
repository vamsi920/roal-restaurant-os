import Link from "next/link";
import { CONTACT_CTA, CONTACT_PAGE_COPY } from "@/lib/landing/contact-page-copy";
import { LandingSection } from "../landing-section";
import { ContactCloseBand } from "./contact-close-band";
import { ContactPilotForm } from "./contact-pilot-form";

export function ContactPageContent() {
  const copy = CONTACT_PAGE_COPY;

  return (
    <div className="public-contact-page min-w-0 overflow-x-clip">
      <LandingSection className="public-contact-page__section scroll-mt-28 border-b-0">
        <div className="public-contact-page__grid grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-start lg:gap-10">
          <ContactPilotForm />

          <aside className="public-contact-sidebar min-w-0" aria-labelledby="contact-sidebar-heading">
            <h2 id="contact-sidebar-heading" className="public-contact-sidebar__title">
              {copy.whatToExpect.title}
            </h2>
            <ol className="public-contact-expect mt-4 space-y-3">
              {copy.whatToExpect.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="public-contact-expect__item flex gap-3 p-3 sm:p-4"
                >
                  <span
                    className="public-contact-expect__num flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="public-contact-expect__title">{step.title}</h3>
                    <p className="public-contact-expect__body">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="public-contact-sidebar__demo mt-5 text-sm text-muted">
              <Link href={CONTACT_CTA.demo.href} className="public-blog-link font-semibold">
                {CONTACT_CTA.demo.label}
              </Link>
              {" · "}
              <Link href={CONTACT_CTA.signup.href} className="public-blog-link font-semibold">
                {CONTACT_CTA.signup.label}
              </Link>
            </p>

            <div className="public-contact-fit mt-6">
              <h3 className="public-contact-sidebar__subtitle">{copy.fit.title}</h3>
              <ul className="public-contact-fit__list mt-2 space-y-1.5 text-sm text-muted">
                {copy.fit.items.map((line) => (
                  <li key={line} className="text-pretty">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </LandingSection>

      <ContactCloseBand />
    </div>
  );
}
