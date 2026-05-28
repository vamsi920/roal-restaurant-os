import Link from "next/link";
import { PublicCtaActions, PublicCtaBand } from "@/components/landing/public";
import { CONTACT_CTA, CONTACT_PAGE_COPY, CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-page-copy";
import { buildPilotMailto } from "@/lib/landing/contact-mailto";

export function ContactCloseBand() {
  const close = CONTACT_PAGE_COPY.close;
  const { bookDemo, form, demo } = CONTACT_CTA;

  return (
    <PublicCtaBand
      titleId={close.titleId}
      eyebrow={close.eyebrow}
      title={close.title}
      description={close.description}
      sectionClassName="public-contact-page__section public-contact-close-band"
      footer={
        <p className="public-contact-close-band__footer mt-3 text-pretty text-sm text-muted">
          <a
            href={buildPilotMailto()}
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            {CONTACT_PILOT_EMAIL}
          </a>
          {" · "}
          <Link href={close.demoHref} className="public-blog-link font-semibold">
            {close.demoLabel}
          </Link>
        </p>
      }
    >
      <PublicCtaActions
        centered
        className="public-contact-cta-actions"
        actions={[
          { ...bookDemo, variant: "primary" },
          { ...form, variant: "ghost" },
          { ...demo, variant: "ghost" },
        ]}
      />
    </PublicCtaBand>
  );
}
