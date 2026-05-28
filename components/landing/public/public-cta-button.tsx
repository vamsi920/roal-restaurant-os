import Link from "next/link";
import { cn } from "@/lib/cn";
import type { PublicCtaAction } from "./public-cta-actions";

function isNativeHref(href: string) {
  return href.startsWith("mailto:") || href.startsWith("tel:");
}

function CtaArrow() {
  return (
    <svg className="landing-btn-arrow" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8h9M8 4.5 12.5 8 8 11.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PublicCtaButton({
  href,
  label,
  variant = "primary",
  tone = "default",
  showArrow,
  className,
}: PublicCtaAction & {
  tone?: "default" | "ink";
  showArrow?: boolean;
  className?: string;
}) {
  const withArrow = variant === "primary" && (showArrow ?? true);

  const classNames = cn(
    "public-cta-btn inline-flex w-full min-w-0 max-w-full items-center justify-center sm:w-auto",
    variant === "primary" ? "public-btn-primary" : "public-btn-ghost",
    tone === "ink" && variant === "ghost" && "public-btn-ghost--on-ink",
    className
  );

  const inner = (
    <>
      <span className="public-btn-label">{label}</span>
      {withArrow ? <CtaArrow /> : null}
    </>
  );

  if (isNativeHref(href)) {
    return (
      <a href={href} className={classNames}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={classNames}>
      {inner}
    </Link>
  );
}
