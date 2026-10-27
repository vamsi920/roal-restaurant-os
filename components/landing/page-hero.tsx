import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  children?: ReactNode;
  align?: "center" | "left";
};

/** Compact hero for secondary pages (about, contact, security, legal, pricing). */
export function PageHero({ eyebrow, title, lead, children, align = "center" }: Props) {
  return (
    <section className="page-hero" data-align={align}>
      <div className="wrap">
        <div className="page-hero__copy">
          <p className="pill">
            <span className="pill__dot" aria-hidden />
            {eyebrow}
          </p>
          <h1 className="h1 mt-5">{title}</h1>
          {lead ? <p className="lead mt-5">{lead}</p> : null}
          {children ? <div className="page-hero__actions">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
