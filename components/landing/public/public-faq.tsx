import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { LandingHeader, LandingSection } from "@/components/landing/landing-section";
import type { LaunchFaqItem, LaunchFaqPage } from "@/lib/landing/launch-faq";
import {
  HOME_FAQ,
  PRICING_FAQ,
  SECURITY_FAQ,
  launchFaqItemsFor,
} from "@/lib/landing/launch-faq";
import { cn } from "@/lib/cn";

type FaqRow = { id: string; question: string; answer: string; link?: LaunchFaqItem["link"] };

function normalizeItems(
  items: readonly LaunchFaqItem[] | readonly { q: string; a: string }[]
): FaqRow[] {
  if (items.length === 0) return [];
  const first = items[0];
  if ("q" in first) {
    return (items as readonly { q: string; a: string }[]).map((item, i) => ({
      id: `faq-${i}`,
      question: item.q,
      answer: item.a,
    }));
  }
  return (items as readonly LaunchFaqItem[]).map((item) => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
    link: item.link,
  }));
}

export type PublicFaqProps = {
  page?: LaunchFaqPage;
  items?: readonly LaunchFaqItem[] | readonly { q: string; a: string }[];
  /** Homepage-style header (eyebrow + lead). */
  homeHeader?: { eyebrow: string; title: string; lead: string };
  /** Marketing section header. */
  sectionHeader?: { titleId: string; title: string; description?: string };
  variant: "accordion-home" | "accordion-marketing" | "cards" | "divided";
  id?: string;
  sectionClassName?: string;
  afterList?: ReactNode;
};

export function PublicFaq({
  page,
  items: itemsProp,
  homeHeader,
  sectionHeader,
  variant,
  id = "faq",
  sectionClassName,
  afterList,
}: PublicFaqProps) {
  const items = normalizeItems(
    itemsProp ??
      (page === "home"
        ? HOME_FAQ.items
        : page === "pricing"
          ? PRICING_FAQ
          : page === "security"
            ? SECURITY_FAQ
            : page
              ? launchFaqItemsFor(page)
              : [])
  );

  if (variant === "accordion-home" && homeHeader) {
    const { eyebrow, title, lead } = homeHeader;
    return (
      <section
        id={id}
        className={cn(
          "home-section home-section--tight home-faq scroll-mt-24",
          sectionClassName
        )}
        aria-labelledby="public-faq-heading"
      >
        <div className="home-wrap">
          <div className="public-reveal">
            <p className="home-eyebrow">{eyebrow}</p>
            <h2 id="public-faq-heading" className="home-h2 mt-2">
              {title}
            </h2>
            <p className="home-lead mt-3 max-w-xl">{lead}</p>
          </div>
          <div className="home-faq__list public-reveal-stagger">
            {items.map((item) => (
              <details key={item.id} className="home-faq__item public-reveal-item">
                <summary className="home-faq__q">{item.question}</summary>
                <div className="home-faq__body">
                  <p className="home-faq__a">{item.answer}</p>
                  {item.link ? (
                    <p className="home-faq__link-row">
                      <Link href={item.link.href} className="home-faq__link">
                        {item.link.label}
                        <span aria-hidden> →</span>
                      </Link>
                    </p>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
          {afterList}
        </div>
      </section>
    );
  }

  if (!sectionHeader) return null;

  const { titleId, title, description } = sectionHeader;

  if (variant === "accordion-marketing" && sectionHeader) {
    const { titleId, title, description } = sectionHeader;
    return (
      <LandingSection
        id={id ?? "faq"}
        labelledBy={titleId}
        className={cn("public-faq public-faq--accordion scroll-mt-24", sectionClassName)}
      >
        <LandingHeader titleId={titleId} title={title} description={description} />
        <div className="public-faq__accordion mt-6 min-w-0">
          {items.map((item) => (
            <details key={item.id} className="public-faq__accordion-item">
              <summary className="public-faq__accordion-q">{item.question}</summary>
              <div className="public-faq__accordion-body">
                <p className="public-faq__accordion-a">{item.answer}</p>
                {item.link ? (
                  <p className="public-faq__accordion-link">
                    <Link href={item.link.href} className="public-blog-link font-medium">
                      {item.link.label}
                    </Link>
                  </p>
                ) : null}
              </div>
            </details>
          ))}
        </div>
        {afterList}
      </LandingSection>
    );
  }

  if (variant === "divided") {
    return (
      <LandingSection labelledBy={titleId} className={sectionClassName}>
        <LandingHeader titleId={titleId} title={title} description={description} />
        <dl className="public-faq__divided mt-10 min-w-0">
          {items.map((item) => (
            <Fragment key={item.id}>
              <dt className="public-faq__divided-row public-faq__divided-q text-pretty font-semibold text-ink">
                {item.question}
              </dt>
              <dd className="public-faq__divided-a mt-2 break-words text-pretty text-sm leading-relaxed text-muted">
                {item.answer}
              </dd>
            </Fragment>
          ))}
        </dl>
        {afterList}
      </LandingSection>
    );
  }

  return (
    <LandingSection
      id={id}
      labelledBy={titleId}
      className={cn("public-faq scroll-mt-28", sectionClassName)}
    >
      <LandingHeader titleId={titleId} title={title} description={description} />
      <div className="public-faq__cards public-reveal-stagger mt-10 min-w-0">
        {items.map((item) => (
          <article
            key={item.id}
            className="public-faq__card public-reveal-item glass-card min-w-0 p-5 sm:p-6"
            aria-labelledby={`${item.id}-q`}
          >
            <h3 id={`${item.id}-q`} className="public-faq__card-q text-pretty font-semibold text-ink">
              {item.question}
            </h3>
            <p className="public-faq__card-a mt-2 break-words text-pretty text-sm leading-relaxed text-muted">
              {item.answer}
            </p>
            {item.link ? (
              <p className="public-faq__card-link mt-3">
                <Link href={item.link.href} className="public-blog-link font-medium">
                  {item.link.label}
                </Link>
              </p>
            ) : null}
          </article>
        ))}
      </div>
      {afterList}
    </LandingSection>
  );
}
