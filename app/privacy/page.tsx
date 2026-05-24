import { LegalPageContent } from "@/components/landing/legal/legal-page-content";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { buildPrivacyPageMetadata } from "@/lib/landing/legal-metadata";
import { PRIVACY_PAGE_COPY } from "@/lib/landing/legal-page-copy";

export const metadata = buildPrivacyPageMetadata();

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <LegalPageContent copy={PRIVACY_PAGE_COPY} titleId="privacy-hero-heading" />
    </MarketingShell>
  );
}
