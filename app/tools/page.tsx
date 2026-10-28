import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "@/app/tools/tools.css";
import { ClosingCta } from "@/components/landing/home/closing-cta";
import { LaunchAeoAnswer } from "@/components/landing/launch-aeo-answer";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { JsonLd, toolUrl } from "@/components/seo/tools/tool-page-frame";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";
import { TOOLS } from "@/lib/seo/site-pages";

const TITLE = "Free Tools for Restaurant Owners: Phone Calculators";
const DESCRIPTION =
  "Free tools for restaurant owners: missed call, delivery commission and phone staff cost calculators, plus greeting scripts and call forwarding codes.";

export const metadata = buildPublicPageMetadata({ title: TITLE, description: DESCRIPTION, canonicalPath: "/tools" });

const BLURBS: Record<string, string> = {
  "missed-call-calculator": "See the sales that ring out when nobody picks up, per week, month and year.",
  "delivery-commission-calculator": "Compare delivery app commission with the same orders taken by phone.",
  "phone-staff-cost-calculator": "Add up wages and overhead for the hours someone is tied to the phone.",
  "phone-host-cost-calculator": "Pay per order or a fixed monthly plan? Find your break-even order count.",
  "phone-greeting-templates": "Twelve copy-ready greetings for open hours, busy nights, after hours and holidays.",
  "call-forwarding-codes": "Common forwarding codes for landlines, mobile and internet phone lines, plus a test checklist.",
};

export default function ToolsHubPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Free tools for restaurant owners",
    url: toolUrl("/tools"),
    itemListElement: TOOLS.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.label,
      url: toolUrl(`/tools/${t.slug}`),
    })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: toolUrl("/") },
      { "@type": "ListItem", position: 2, name: "Free tools", item: toolUrl("/tools") },
    ],
  };

  return (
    <SiteShell>
      <JsonLd data={itemList} />
      <JsonLd data={breadcrumb} />
      <PageHero
        eyebrow="Free tools"
        title="Free tools for restaurant owners"
        lead="Quick calculators and copy-ready scripts for your restaurant phone. No sign-up needed."
      />

      <section className="section !pt-0" aria-label="Short answer">
        <div className="wrap">
          <div className="prose-card reveal">
            <LaunchAeoAnswer
              titleId="tools-answer"
              question="What do these free restaurant tools do?"
              answer="They help you put numbers on your phone: what missed calls cost, what delivery app commissions add up to, and what phone coverage costs in wages. There are also greeting scripts and call forwarding codes you can use today."
            />
          </div>
        </div>
      </section>

      <section className="section !pt-0" aria-label="All tools">
        <div className="wrap">
          <div className="tool-hub-grid reveal">
            {TOOLS.map((t) => (
              <Link key={t.slug} href={`/tools/${t.slug}`} className="tool-hub-card">
                <h2>{t.label}</h2>
                <p>{BLURBS[t.slug] ?? ""}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink">
                  Open tool <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/try" className="btn-primary btn-lg">
              Build a free test host from your website
            </Link>
            <Link href="/pricing" className="btn-ghost btn-lg">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <ClosingCta />
    </SiteShell>
  );
}
