import { PublicCtaActions } from "@/components/landing/public";
import { SECURITY_CTA } from "@/lib/landing/security-page-copy";
import { cn } from "@/lib/cn";

export function SecuritySectionCta({ className }: { className?: string }) {
  const { primary, secondary } = SECURITY_CTA;

  return (
    <PublicCtaActions
      className={cn("public-security-cta-actions", className)}
      actions={[
        { ...primary, variant: "primary" },
        { ...secondary, variant: "ghost" },
      ]}
    />
  );
}
