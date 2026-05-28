import Link from "next/link";
import {
  SECURITY_CTA,
  SECURITY_PAGE_COPY,
  SECURITY_PILLARS,
} from "@/lib/landing/security-page-copy";
import { LandingHeader, LandingSection } from "../landing-section";
import { SecurityCloseBand } from "./security-close-band";
import { SecurityFaq } from "./security-faq";

export function SecurityPageContent() {
  const copy = SECURITY_PAGE_COPY;

  return (
    <div className="public-security-page min-w-0 overflow-x-clip">
      <div className="public-security-jump-wrap landing-wrap landing-wrap-tight min-w-0">
        <nav className="public-page-jump-nav" aria-label="On this page">
          <ul className="public-page-jump-nav__list">
            <li>
              <a href={`#${copy.pillars.titleId}`} className="public-page-jump-nav__link">
                Protections
              </a>
            </li>
            <li>
              <a href={`#${copy.faq.titleId}`} className="public-page-jump-nav__link">
                FAQ
              </a>
            </li>
            <li>
              <a href={`#${copy.close.titleId}`} className="public-page-jump-nav__link">
                Pilot review
              </a>
            </li>
          </ul>
        </nav>
      </div>
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

      <SecurityFaq />

      <SecurityCloseBand />
    </div>
  );
}
