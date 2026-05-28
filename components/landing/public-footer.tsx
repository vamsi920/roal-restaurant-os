import "@/app/footer-pages.css";
import Link from "next/link";
import { LANDING_FOOTER } from "@/lib/landing/footer-copy";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
};

export function PublicFooter({ className }: Props) {
  const year = new Date().getFullYear();
  const {
    brandName,
    brandHref,
    tagline,
    demoCta,
    contactCta,
    essentialLinks,
    copyrightName,
  } = LANDING_FOOTER;

  return (
    <footer className={cn("public-footer min-w-0 overflow-x-clip", className)}>
      <div className="public-footer__inner min-w-0">
        <div className="public-footer__brand">
          <Link href={brandHref} className="public-footer__brand-name">
            {brandName}
          </Link>
          <p className="public-footer__tagline">{tagline}</p>
        </div>

        <div className="public-footer__ctas" aria-label="Get started">
          <Link href={demoCta.href} className="public-footer__cta public-footer__cta--primary">
            {demoCta.label}
          </Link>
          <Link href={contactCta.href} className="public-footer__cta public-footer__cta--secondary">
            {contactCta.label}
          </Link>
        </div>

        <nav className="public-footer__nav" aria-label="Footer">
          <ul className="public-footer__links">
            {essentialLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="public-footer__copy">
          © {year} {copyrightName}
        </p>
      </div>
    </footer>
  );
}
