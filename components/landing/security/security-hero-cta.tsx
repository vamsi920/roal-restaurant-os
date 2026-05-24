import { PublicCtaActions } from "@/components/landing/public";
import { SECURITY_CTA } from "@/lib/landing/security-page-copy";
import Link from "next/link";

export function SecurityHeroCta() {
  const { primary, secondary, trust } = SECURITY_CTA;

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <PublicCtaActions
        actions={[
          { ...primary, variant: "primary" },
          { ...secondary, variant: "ghost" },
        ]}
      />
      <Link
        href={trust.href}
        className="public-security-hero__trust-link public-blog-link text-sm sm:text-center"
      >
        {trust.label}
      </Link>
    </div>
  );
}
