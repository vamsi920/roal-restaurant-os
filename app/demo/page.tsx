import "@/app/demo-page.css";
import { DemoPageContent } from "@/components/landing/demo/demo-page-content";
import { DemoPageHero } from "@/components/landing/demo/demo-page-hero";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { buildDemoPageMetadata } from "@/lib/landing/demo-metadata";
import { getLandingPreview } from "@/lib/get-landing-preview";

export const metadata = buildDemoPageMetadata();

export default async function DemoPage() {
  const preview = await getLandingPreview();

  return (
    <MarketingShell>
      <div className="public-demo-shell min-w-0 overflow-x-clip">
        <DemoPageHero />
        <DemoPageContent preview={preview} />
      </div>
    </MarketingShell>
  );
}
