import Link from "next/link";
import { LANDING_FOOTER } from "@/lib/landing/footer-copy";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
};

export function PublicFooter({ className }: Props) {
  const year = new Date().getFullYear();
  const { tagline, trustLine, copyrightName, email, columns, login, signup } = LANDING_FOOTER;

  return (
    <footer className={cn("public-footer", className)}>
      <div className="public-footer__inner">
        <div className="public-footer__panel">
          <p className="public-footer__tagline">{tagline}</p>

          <div className="public-footer__grid">
            {columns.map((column) => (
              <div key={column.title} className="public-footer__col">
                <p className="public-footer__col-title">{column.title}</p>
                <ul className="public-footer__col-links">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="public-footer__actions">
            <div className="public-footer__ctas">
              <Link href={login.href} className="public-footer__login">
                {login.label}
              </Link>
              <Link href={signup.href} className="public-footer__demo">
                {signup.label}
              </Link>
            </div>
            <a href={`mailto:${email}`} className="public-footer__email">
              {email}
            </a>
          </div>
        </div>

        <div className="public-footer__meta">
          <p className="public-footer__trust">{trustLine}</p>
          <p className="public-footer__copy">
            © {year} {copyrightName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
