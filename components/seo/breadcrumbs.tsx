import Link from "next/link";
import type { Crumb } from "@/lib/seo/json-ld";

/** Visible breadcrumb trail; pair with breadcrumbJsonLd for the schema. */
export function Breadcrumbs({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={`seo-crumbs ${className ?? ""}`}>
      <ol>
        {crumbs.map((c, i) => (
          <li key={c.path}>
            {i === crumbs.length - 1 ? <span aria-current="page">{c.name}</span> : <Link href={c.path}>{c.name}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
