import { AboutCta } from "@/components/landing/about/about-cta";
import { PublicCtaBand } from "@/components/landing/public";
import { ABOUT_PAGE_COPY } from "@/lib/landing/about-page-copy";

export function AboutCtaBand() {
  const close = ABOUT_PAGE_COPY.close;

  return (
    <PublicCtaBand
      variant="ink"
      titleId={close.titleId}
      eyebrow={close.eyebrow}
      title={close.title}
      description={close.description}
      sectionClassName="public-about-cta-band"
      footer={<p className="mt-6 text-pretty text-xs text-muted">{close.mailtoNote}</p>}
    >
      <AboutCta centered showContactLink />
    </PublicCtaBand>
  );
}
