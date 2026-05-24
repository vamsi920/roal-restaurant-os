import Link from "next/link";
import { cn } from "@/lib/cn";
import { LEGAL_CONTACT_EMAIL } from "@/lib/landing/legal-page-copy";
import { LandingSection } from "@/components/landing/landing-section";

type LegalCopy = {
  draftNotice?: string;
  hero: { eyebrow: string; title: string; description: string };
  updated: string;
  paragraphs: readonly string[];
  contactLead: string;
};

type Props = {
  copy: LegalCopy;
  titleId: string;
};

export function LegalPageContent({ copy, titleId }: Props) {
  return (
    <div className="public-legal-page min-w-0">
      <div className="public-legal-hero">
        <div className="public-legal-hero__wash" aria-hidden />
        <section className="py-0" aria-labelledby={titleId}>
          <div className="landing-wrap landing-wrap-tight relative z-[1] min-w-0 py-10 sm:py-12">
            <p className="public-legal-hero__eyebrow">{copy.hero.eyebrow}</p>
            <h1 id={titleId} className="public-legal-hero__title">
              {copy.hero.title}
            </h1>
            <p className="public-legal-hero__deck">{copy.hero.description}</p>
          </div>
        </section>
      </div>

      <LandingSection className="public-legal-page__section">
        <article className="public-legal-panel glass-card mx-auto max-w-2xl min-w-0 p-6 sm:p-8">
          {copy.draftNotice ? (
            <p className="public-legal-draft-notice text-pretty text-sm text-ink" role="note">
              {copy.draftNotice}
            </p>
          ) : null}
          <p className={cn("text-pretty text-xs text-muted", copy.draftNotice && "mt-4")}>
            {copy.updated}
          </p>
          <div className="public-legal-panel__body">
            {copy.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="public-legal-panel__paragraph">
                {paragraph}
              </p>
            ))}
          </div>
          <p className="public-legal-panel__contact">
            {copy.contactLead}{" "}
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="public-blog-link font-medium"
            >
              {LEGAL_CONTACT_EMAIL}
            </a>
            {" · "}
            <Link href="/contact" className="public-blog-link font-medium">
              Contact form
            </Link>
          </p>
        </article>
      </LandingSection>
    </div>
  );
}
