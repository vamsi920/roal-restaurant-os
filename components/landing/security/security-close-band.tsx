import Link from "next/link";
import { PublicCtaActions, PublicCtaBand } from "@/components/landing/public";
import { SECURITY_CTA, SECURITY_PAGE_COPY } from "@/lib/landing/security-page-copy";

export function SecurityCloseBand() {
  const close = SECURITY_PAGE_COPY.close;
  const { primary, secondary } = SECURITY_CTA;

  return (
    <PublicCtaBand
      titleId={close.titleId}
      eyebrow={close.eyebrow}
      title={close.title}
      description={close.description}
      sectionClassName="public-security-page__section"
      footer={
        <p className="mt-6 text-pretty text-sm text-muted">
          {close.demoNote}{" "}
          <Link href={close.demoHref} className="public-blog-link font-semibold">
            {close.demoLabel}
          </Link>
        </p>
      }
    >
      <PublicCtaActions
        centered
        actions={[
          { href: primary.href, label: primary.label, variant: "primary" },
          { href: secondary.href, label: secondary.label, variant: "ghost" },
        ]}
      />
    </PublicCtaBand>
  );
}
