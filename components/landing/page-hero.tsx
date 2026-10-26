import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: ReactNode;
};

/** Compact hero for secondary pages (about, contact, security, legal). */
export function PageHero({ eyebrow, title, lead, children }: Props) {
  return (
    <section className="page-hero">
      <div className="wrap">
        <div className="page-hero__copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="h1">{title}</h1>
          {lead ? <p className="lead">{lead}</p> : null}
          {children ? <div className="mt-6 flex flex-wrap gap-3">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
