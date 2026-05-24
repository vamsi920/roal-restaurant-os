import Link from "next/link";
import { PublicCtaActions, PublicCtaBand } from "@/components/landing/public";
import { CONTACT_CTA, CONTACT_PAGE_COPY, CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-page-copy";
import { buildPilotMailto } from "@/lib/landing/contact-mailto";

export function ContactCloseBand() {
  const close = CONTACT_PAGE_COPY.close;
  const { mailto, form, demo } = CONTACT_CTA;

  return (
    <PublicCtaBand
      titleId={close.titleId}
      eyebrow={close.eyebrow}
      title={close.title}
      description={close.description}
      sectionClassName="public-contact-page__section"
      footer={
        <>
          <p className="mt-4 text-pretty text-xs text-muted">
            <a
              href={buildPilotMailto()}
              className="font-medium text-ink underline-offset-2 hover:underline"
            >
              {CONTACT_PILOT_EMAIL}
            </a>
          </p>
          <p className="mt-3 text-pretty text-sm text-muted">
            {close.demoNote}{" "}
            <Link href={close.demoHref} className="public-blog-link font-semibold">
              {close.demoLabel}
            </Link>
            . Prefer to explore first?{" "}
            <Link href={demo.href} className="public-blog-link font-semibold">
              {demo.label}
            </Link>
          </p>
        </>
      }
    >
      <PublicCtaActions
        centered
        actions={[
          { href: form.href, label: form.label, variant: "primary" },
          { href: mailto.href, label: mailto.label, variant: "ghost" },
        ]}
      />
    </PublicCtaBand>
  );
}
