import { PublicCtaActions } from "@/components/landing/public";
import { CONTACT_CTA } from "@/lib/landing/contact-page-copy";

export function ContactHeroCta() {
  const { form, mailto } = CONTACT_CTA;

  return (
    <PublicCtaActions
      actions={[
        { ...form, variant: "primary" },
        { ...mailto, variant: "ghost" },
      ]}
    />
  );
}
