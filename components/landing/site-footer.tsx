import Link from "next/link";
import { RoalWordmark } from "@/components/landing/roal-wordmark";
import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";
import { SITE_FEATURED_ON, SITE_FOOTER_COLUMNS, SITE_FOOTER_LINE, SITE_FOOTER_MADE_FOR } from "@/lib/landing/site-nav";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="site-footer__grid">
          <div className="site-footer__brand min-w-0">
            <Link href="/" aria-label="ROAL home" className="inline-flex">
              <RoalWordmark />
            </Link>
            <p className="site-footer__line">{SITE_FOOTER_LINE}</p>
            <a href={`mailto:${CONTACT_PILOT_EMAIL}`} className="site-footer__email">
              {CONTACT_PILOT_EMAIL}
            </a>
          </div>
          {SITE_FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="site-footer__col min-w-0">
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="site-footer__featured">
          Find ROAL on{" "}
          {SITE_FEATURED_ON.map((f, i) => (
            <span key={f.href}>
              {i > 0 ? " · " : null}
              <a href={f.href} target="_blank" rel="noopener">
                {f.label}
              </a>
            </span>
          ))}
        </p>
        <div className="site-footer__meta">
          <span>© {year} ROAL · {SITE_FOOTER_MADE_FOR}</span>
          <span>{PRICING_RATE_AMOUNT} per completed phone order. Nothing otherwise.</span>
        </div>
      </div>
    </footer>
  );
}
