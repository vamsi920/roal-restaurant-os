import Link from "next/link";
import { PublicCtaActions } from "@/components/landing/public";
import { DEMO_CTA } from "@/lib/landing/demo-page-copy";

export function DemoPageHeroCta() {
  return (
    <div className="public-demo-hero-cta">
      <PublicCtaActions
        actions={[
          { ...DEMO_CTA.bookDemoCall, variant: "primary" },
          { ...DEMO_CTA.signup, variant: "ghost" },
        ]}
      />
      <p className="public-demo-hero-cta__scroll">
        <Link href="#demo-video" className="public-blog-link font-medium">
          Watch the sample layout
        </Link>
      </p>
    </div>
  );
}
