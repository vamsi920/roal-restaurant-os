import Link from "next/link";
import { AboutCtaBand } from "@/components/landing/about/about-cta-band";
import { ABOUT_PAGE_COPY } from "@/lib/landing/about-page-copy";
import { LandingHeader, LandingSection } from "@/components/landing/landing-section";
import { cn } from "@/lib/cn";

export function AboutPageContent() {
  const { pillars } = ABOUT_PAGE_COPY;

  return (
    <>
      <LandingSection labelledBy={pillars.titleId} className="public-about-page__pillars border-b-0">
        <LandingHeader
          titleId={pillars.titleId}
          eyebrow={pillars.eyebrow}
          title={pillars.title}
        />
        <p className="landing-lead mt-3 max-w-xl text-pretty">{pillars.lead}</p>
        <ul className="public-about-pillars mt-6 sm:mt-8">
          {pillars.items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "public-about-pillars__item min-w-0",
                item.id === "missed-calls" && "public-about-pillars__item--pain"
              )}
            >
              <h3 className="public-about-pillars__title">{item.title}</h3>
              <p className="public-about-pillars__body">{item.body}</p>
            </li>
          ))}
        </ul>
        <p className="public-about-page__blog-link mt-6 text-sm text-muted sm:mt-8">
          <Link href={pillars.blogLink.href} className="public-blog-link font-semibold">
            {pillars.blogLink.label}
          </Link>
        </p>
      </LandingSection>

      <AboutCtaBand />
    </>
  );
}
