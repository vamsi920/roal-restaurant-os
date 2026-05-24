import Link from "next/link";
import { PublicCtaActions } from "@/components/landing/public";
import { ABOUT_CTA } from "@/lib/landing/about-page-copy";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  centered?: boolean;
  tone?: "default" | "ink";
  showContactLink?: boolean;
};

export function AboutCta({ className, centered, tone = "default", showContactLink = false }: Props) {
  const { primary, secondary, tertiary } = ABOUT_CTA;

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
      {showContactLink ? (
        <p className={cn("mt-6 text-sm", centered && "text-center")}>
          <Link
            href={tertiary.href}
            className={cn(
              "font-medium underline-offset-2 hover:underline",
              tone === "ink" ? "text-white/90" : "public-blog-link"
            )}
          >
            {tertiary.label}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
