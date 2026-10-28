import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "@/app/tools/tools.css";
import { FaqList } from "@/components/landing/faq-list";
import { ClosingCta } from "@/components/landing/home/closing-cta";
import { LaunchAeoAnswer } from "@/components/landing/launch-aeo-answer";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import type { LaunchFaqItem } from "@/lib/landing/launch-faq";
import { TOOLS } from "@/lib/seo/site-pages";
import { absoluteUrl } from "@/lib/site-url";

const FALLBACK_ORIGIN = "https://tryroal.com";

export function toolUrl(path: string): string {
  return absoluteUrl(path) ?? `${FALLBACK_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export type ToolSlug = (typeof TOOLS)[number]["slug"];

export function toolLabel(slug: string): string {
  return TOOLS.find((t) => t.slug === slug)?.label ?? slug;
}

export type ToolFaq = { id: string; question: string; answer: string };

/** Pages outside /tools that tool pages may link to. */
export const TOOL_SITE_LINKS = {
  "/pricing": "Pricing: $0.90 per completed order",
  "/try": "Build a free test host",
  "/compare/answering-service": "AI phone host vs answering service",
  "/compare/delivery-apps": "Phone orders vs delivery apps",
  "/use-cases/rush-hour": "Rush-hour phone orders",
  "/blog": "Blog for restaurant owners",
} as const;

export type ToolSiteLink = keyof typeof TOOL_SITE_LINKS;

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

type Props = {
  slug: string;
  title: ReactNode;
  lead: string;
  aeo: { question: string; answer: string };
  /** The calculator or reference content. */
  children: ReactNode;
  howTitle?: string;
  how: ReactNode;
  faqs: ToolFaq[];
  relatedTools: string[];
  relatedPages: ToolSiteLink[];
  /** WebApplication or HowTo JSON-LD for this page. */
  pageJsonLd: Record<string, unknown>;
  /** Optional content between the tool and "How the math works". */
  extra?: ReactNode;
};

export function webApplicationJsonLd(slug: string, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: toolUrl(`/tools/${slug}`),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any (runs in the browser)",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "ROAL", url: toolUrl("/") },
  };
}

/** Shared layout for every /tools/<slug> page. */
export function ToolPageFrame({
  slug,
  title,
  lead,
  aeo,
  children,
  howTitle = "How the math works",
  how,
  faqs,
  relatedTools,
  relatedPages,
  pageJsonLd,
  extra,
}: Props) {
  const path = `/tools/${slug}`;
  const label = toolLabel(slug);
  const faqItems: LaunchFaqItem[] = faqs.map((f) => ({ ...f, pages: [] }));

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: toolUrl(path),
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: toolUrl("/") },
      { "@type": "ListItem", position: 2, name: "Free tools", item: toolUrl("/tools") },
      { "@type": "ListItem", position: 3, name: label, item: toolUrl(path) },
    ],
  };

  return (
    <SiteShell>
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={pageJsonLd} />

      <nav aria-label="Breadcrumb" className="wrap pt-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/tools">Free tools</Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">
            {label}
          </li>
        </ol>
      </nav>

      <PageHero eyebrow="Free tool" title={title} lead={lead} />

      <section className="section !pt-0" aria-label="Short answer">
        <div className="wrap">
          <div className="prose-card reveal">
            <LaunchAeoAnswer titleId={`${slug}-answer`} question={aeo.question} answer={aeo.answer} />
          </div>
        </div>
      </section>

      <section className="section !pt-0" aria-label={label}>
        <div className="wrap reveal">{children}</div>
      </section>

      {extra}

      <section className="section" aria-labelledby={`${slug}-how`}>
        <div className="wrap">
          <div className="prose-card reveal">
            <div className="prose">
              <h2 id={`${slug}-how`}>{howTitle}</h2>
              {how}
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby={`${slug}-faq`}>
        <div className="wrap">
          <div className="faq-layout">
            <div className="reveal min-w-0">
              <p className="pill">
                <span className="pill__dot" aria-hidden />
                FAQ
              </p>
              <h2 id={`${slug}-faq`} className="h2 mt-5">
                Common questions
              </h2>
              <p className="lead mt-4">Want to hear it on your own menu? Building a test host is free.</p>
              <div className="mt-6">
                <Link href="/try" className="btn-primary btn-lg">
                  Build a free test host from your website <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
            <div className="reveal min-w-0">
              <FaqList items={faqItems} />
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby={`${slug}-related`}>
        <div className="wrap">
          <div className="section-head reveal">
            <h2 id={`${slug}-related`} className="h2">
              Related
            </h2>
          </div>
          <div className="tool-related reveal">
            {relatedTools.map((s) => (
              <Link key={s} href={`/tools/${s}`}>
                {toolLabel(s)} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ))}
            {relatedPages.map((p) => (
              <Link key={p} href={p}>
                {TOOL_SITE_LINKS[p]} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ))}
            <Link href="/tools">
              All free tools <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <ClosingCta />
    </SiteShell>
  );
}
