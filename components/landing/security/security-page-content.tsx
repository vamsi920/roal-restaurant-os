import Link from "next/link";
import {
  SECURITY_CTA,
  SECURITY_GO_LIVE,
  SECURITY_PAGE_COPY,
  SECURITY_PILLARS,
  SECURITY_TECHNICAL,
} from "@/lib/landing/security-page-copy";
import { LandingHeader, LandingSection } from "../landing-section";
import { SecurityCloseBand } from "./security-close-band";
import { SecurityFaq } from "./security-faq";

export function SecurityPageContent() {
  const copy = SECURITY_PAGE_COPY;

  return (
    <div className="public-security-page min-w-0">
      <LandingSection labelledBy={copy.pillars.titleId} className="public-security-page__section border-b-0">
        <LandingHeader
          titleId={copy.pillars.titleId}
          eyebrow={copy.pillars.eyebrow}
          title={copy.pillars.title}
          description={copy.pillars.description}
        />
        <ul className="public-security-tech mt-10 grid min-w-0 gap-4 sm:grid-cols-2">
          {SECURITY_PILLARS.map((pillar) => (
            <li key={pillar.id} className="public-security-tech__item min-w-0 p-5 sm:p-6">
              <h3 className="text-pretty text-sm font-semibold text-ink">{pillar.title}</h3>
              <p className="mt-2 break-words text-pretty text-sm leading-relaxed text-muted">
                {pillar.body}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">
          <Link href={SECURITY_CTA.trust.href} className="public-blog-link font-medium">
            {SECURITY_CTA.trust.label}
          </Link>
        </p>
      </LandingSection>

      <LandingSection
        tone="muted"
        labelledBy={copy.goLive.titleId}
        className="public-security-page__section border-b-0"
      >
        <LandingHeader
          titleId={copy.goLive.titleId}
          title={copy.goLive.title}
          description={copy.goLive.description}
        />
        <ul className="public-security-checklist mt-8 min-w-0 space-y-3">
          {SECURITY_GO_LIVE.map((item) => (
            <li key={item} className="public-security-checklist__item flex min-w-0 gap-3 px-4 py-3">
              <span className="public-security-checklist__marker mt-1.5 shrink-0" aria-hidden />
              <span className="break-words text-pretty text-sm text-muted">{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-pretty text-sm text-muted">
          Questions?{" "}
          <Link href="/contact" className="public-blog-link font-medium">
            Contact us
          </Link>{" "}
          for a pilot walkthrough.
        </p>
      </LandingSection>

      <LandingSection
        id="security-technical"
        labelledBy={copy.technical.titleId}
        className="public-security-page__section scroll-mt-28 border-b-0"
      >
        <LandingHeader
          titleId={copy.technical.titleId}
          eyebrow={copy.technical.eyebrow}
          title={copy.technical.title}
          description={copy.technical.description}
        />
        <ul className="public-security-tech mt-10 grid min-w-0 gap-4 sm:grid-cols-2">
          {SECURITY_TECHNICAL.map((item) => (
            <li key={item.title} className="public-security-tech__item min-w-0 p-5 sm:p-6">
              <h3 className="text-pretty text-sm font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 break-words text-pretty text-sm leading-relaxed text-muted">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <SecurityFaq />

      <SecurityCloseBand />
    </div>
  );
}
