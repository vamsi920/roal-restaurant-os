import { ABOUT_PAGE_COPY } from "@/lib/landing/about-page-copy";
import { LandingHeader, LandingSection } from "@/components/landing/landing-section";

export function AboutCompanyStory() {
  const story = ABOUT_PAGE_COPY.companyStory;

  return (
    <LandingSection labelledBy={story.titleId}>
      <LandingHeader
        titleId={story.titleId}
        eyebrow={story.eyebrow}
        title={story.title}
        description={story.lead}
      />
      <div className="public-about-story public-glass-panel mt-10 min-w-0 p-6 sm:p-8">
        <div className="public-about-story__body max-w-3xl space-y-4 text-pretty text-muted">
          {story.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <ul className="public-about-story__principles mt-10" aria-label="Product principles">
          {story.principles.map((principle) => (
            <li key={principle.id} className="public-about-story__principle min-w-0">
              <h3 className="public-about-story__principle-title">{principle.title}</h3>
              <p className="public-about-story__principle-body">{principle.body}</p>
            </li>
          ))}
        </ul>
        <p className="public-about-story__footnote mt-8 text-pretty text-sm text-muted">
          {story.footnote}
        </p>
      </div>
    </LandingSection>
  );
}
