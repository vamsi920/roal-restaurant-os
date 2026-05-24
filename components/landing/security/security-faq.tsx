import { PublicFaq } from "@/components/landing/public";
import { SECURITY_PAGE_COPY } from "@/lib/landing/security-page-copy";

export function SecurityFaq() {
  const { faq } = SECURITY_PAGE_COPY;

  return (
    <PublicFaq
      page="security"
      variant="cards"
      sectionHeader={{ titleId: faq.titleId, title: faq.title, description: faq.description }}
      sectionClassName="public-security-page__section"
    />
  );
}
