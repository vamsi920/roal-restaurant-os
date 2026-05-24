import Link from "next/link";
import { PublicCtaActions } from "@/components/landing/public";
import { DEMO_CTA, DEMO_MAILTO_EMAIL, DEMO_PAGE_COPY } from "@/lib/landing/demo-page-copy";

export function DemoCtaBand() {
  const close = DEMO_PAGE_COPY.close;
  const { bookDemoCall, signup } = DEMO_CTA;

  return (
    <section
      id="demo-cta"
      className="public-demo-close-band scroll-mt-28"
      aria-labelledby={close.titleId}
    >
      <div className="public-demo-close-band__panel glass-card">
        <p className="public-demo-close-band__eyebrow">{close.eyebrow}</p>
        <h2 id={close.titleId} className="public-demo-close-band__title">
          {close.title}
        </h2>
        <p className="public-demo-close-band__deck">{close.description}</p>
        <PublicCtaActions
          centered
          className="public-demo-cta-actions mt-6"
          actions={[
            { ...bookDemoCall, variant: "primary" },
            { ...signup, variant: "ghost" },
          ]}
        />
        <p className="public-demo-close-band__mailto">
          <a href={bookDemoCall.href} className="public-blog-link font-semibold">
            {DEMO_MAILTO_EMAIL}
          </a>
        </p>
        <p className="public-demo-close-band__footer">
          Prefer a form?{" "}
          <Link href="/contact" className="public-blog-link font-semibold">
            Contact us
          </Link>
          . Success-based pricing on{" "}
          <Link href={close.pricingHref} className="public-blog-link font-semibold">
            pricing
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
