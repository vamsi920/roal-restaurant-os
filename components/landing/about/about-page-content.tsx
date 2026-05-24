import Link from "next/link";
import { AboutCompanyStory } from "@/components/landing/about/about-company-story";
import { AboutCtaBand } from "@/components/landing/about/about-cta-band";
import { ABOUT_PAGE_COPY } from "@/lib/landing/about-page-copy";
import { LandingHeader, LandingSection } from "@/components/landing/landing-section";

export function AboutPageContent() {
  const copy = ABOUT_PAGE_COPY;

  return (
    <>
      <LandingSection labelledBy={copy.whyRoal.titleId} className="border-b-0">
        <LandingHeader
          titleId={copy.whyRoal.titleId}
          eyebrow={copy.whyRoal.eyebrow}
          title={copy.whyRoal.title}
          description={copy.whyRoal.description}
        />
        <ol className="public-about-steps mt-10">
          {copy.whyRoal.steps.map((step, index) => (
            <li key={step.id} className="public-about-steps__item min-w-0">
              <span className="public-about-steps__num" aria-hidden>
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="public-about-steps__title">{step.title}</h3>
                <p className="public-about-steps__body">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm">
          <Link href={copy.problem.blogLink.href} className="public-blog-link font-semibold">
            {copy.problem.blogLink.label}
          </Link>
        </p>
      </LandingSection>

      <AboutCompanyStory />

      <LandingSection labelledBy={copy.promise.titleId} className="border-b-0">
        <LandingHeader
          titleId={copy.promise.titleId}
          eyebrow={copy.promise.eyebrow}
          title={copy.promise.title}
        />
        <div className="public-about-promise mt-10">
          <div className="public-about-promise__col min-w-0">
            <h3 className="public-about-promise__label">We stand behind</h3>
            <ul>
              {copy.promise.doItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="public-about-promise__col min-w-0">
            <h3 className="public-about-promise__label">We do not promise</h3>
            <ul>
              {copy.promise.dontItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </LandingSection>

      <AboutCtaBand />
    </>
  );
}
