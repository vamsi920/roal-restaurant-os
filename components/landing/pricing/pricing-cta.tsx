import Link from "next/link";
import { PublicCtaActions } from "@/components/landing/public";
import { PRICING_CTA, PRICING_PAGE_COPY } from "@/lib/landing/pricing-page-copy";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  centered?: boolean;
  tone?: "default" | "ink";
  showSignupLink?: boolean;
};

export function PricingCta({
  className,
  centered,
  tone = "default",
  showSignupLink = true,
}: Props) {
  const { primary, secondary, signup } = PRICING_CTA;

  return (
    <div className={cn(centered && "flex flex-col items-center", className)}>
      <PublicCtaActions
        centered={centered}
        tone={tone}
        actions={[
          { href: primary.href, label: primary.label, variant: "primary" },
          { href: secondary.href, label: secondary.label, variant: "ghost" },
        ]}
      />
      {showSignupLink ? (
        <p
          className={cn(
            "public-pricing-cta__signup mt-6 text-sm",
            centered && "text-center"
          )}
        >
          <Link
            href={signup.href}
            className={cn(
              "font-medium underline-offset-2 hover:underline",
              tone === "ink" ? "text-white/90" : "public-blog-link"
            )}
          >
            {signup.label}
          </Link>
          <span className={cn("text-muted", tone === "ink" && "text-white/70")}>
            {" "}
            — {PRICING_PAGE_COPY.signupNote}
          </span>
        </p>
      ) : null}
    </div>
  );
}
