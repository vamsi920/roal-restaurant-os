import Link from "next/link";
import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { SITE_FOOTER_COLUMNS, SITE_FOOTER_LINE } from "@/lib/landing/site-nav";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="site-footer__grid">
          <div className="min-w-0">
            <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
              ROAL
            </Link>
            <p className="site-footer__line mt-3">{SITE_FOOTER_LINE}</p>
            <a href={`mailto:${CONTACT_PILOT_EMAIL}`} className="mt-4 inline-block text-sm text-base/70 hover:text-accent">
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
        <div className="site-footer__meta">
          <span>© {year} ROAL</span>
          <span>$0.90 per completed phone order. Nothing otherwise.</span>
        </div>
      </div>
      <div className="site-footer__wordmark" aria-hidden>
        ROAL
      </div>
    </footer>
  );
}
