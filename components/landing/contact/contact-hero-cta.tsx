import { PublicCtaActions } from "@/components/landing/public";
import { CONTACT_CTA } from "@/lib/landing/contact-page-copy";

export function ContactHeroCta() {
  const { bookDemo, form } = CONTACT_CTA;

  return (
    <PublicCtaActions
      className="public-contact-cta-actions"
      actions={[
        { ...bookDemo, variant: "primary" },
        { ...form, variant: "ghost" },
      ]}
    />
  );
}
