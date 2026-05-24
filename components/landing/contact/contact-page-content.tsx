import Link from "next/link";
import { CONTACT_PAGE_COPY } from "@/lib/landing/contact-page-copy";
import { LandingSection } from "../landing-section";
import { ContactCloseBand } from "./contact-close-band";
import { ContactPilotForm } from "./contact-pilot-form";

export function ContactPageContent() {
  const copy = CONTACT_PAGE_COPY;

  return (
    <div className="public-contact-page min-w-0">
      <LandingSection className="public-contact-page__section scroll-mt-28 border-b-0">
        <div className="public-contact-page__grid grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-start lg:gap-12">
          <ContactPilotForm />

          <div className="public-contact-sidebar min-w-0">
            <h2 className="public-contact-sidebar__title">{copy.whatToExpect.title}</h2>
            <ol className="public-contact-expect mt-6 space-y-4">
              {copy.whatToExpect.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="public-contact-expect__item flex gap-4 p-4 sm:p-5"
                >
                  <span
                    className="public-contact-expect__num flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold"
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

            <div className="public-contact-demo-aside public-glass-panel mt-8 p-5">
              <h3 className="public-contact-sidebar__subtitle">{copy.demoAside.title}</h3>
              <p className="public-contact-sidebar__body">{copy.demoAside.description}</p>
              <Link href={copy.demoAside.cta.href} className="public-btn-ghost mt-4 inline-flex min-h-11">
                {copy.demoAside.cta.label}
              </Link>
            </div>

            <div className="public-contact-self-serve mt-6">
              <h3 className="public-contact-sidebar__subtitle">{copy.selfServe.title}</h3>
              <p className="public-contact-sidebar__body">{copy.selfServe.description}</p>
              <Link
                href={copy.selfServe.cta.href}
                className="public-btn-primary mt-4 inline-flex min-h-11"
              >
                {copy.selfServe.cta.label}
              </Link>
            </div>

            <div className="public-contact-fit mt-10">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-subtle">
                {copy.fit.title}
              </h3>
              <ul className="public-contact-fit__list mt-3 space-y-2 text-sm text-muted">
                {copy.fit.items.map((line) => (
                  <li key={line} className="text-pretty">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </LandingSection>

      <ContactCloseBand />
    </div>
  );
}
