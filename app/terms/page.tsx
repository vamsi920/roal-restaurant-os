import { LegalPageContent } from "@/components/landing/legal/legal-page-content";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { buildTermsPageMetadata } from "@/lib/landing/legal-metadata";
import { TERMS_PAGE_COPY } from "@/lib/landing/legal-page-copy";

export const metadata = buildTermsPageMetadata();

export default function TermsPage() {
  return (
    <MarketingShell>
      <LegalPageContent copy={TERMS_PAGE_COPY} titleId="terms-hero-heading" />
    </MarketingShell>
  );
}
