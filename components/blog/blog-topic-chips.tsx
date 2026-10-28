import Link from "next/link";
import { BLOG_CATEGORIES, type BlogCategorySlug } from "@/lib/blog/categories";
import { getPostsByCategory } from "@/lib/blog";
import { cn } from "@/lib/cn";

/** Crawlable topic links (each topic has its own hub page). */
export function BlogTopicChips({ active }: { active?: BlogCategorySlug | "all" }) {
  return (
    <nav className="blog-category-filter" aria-label="Blog topics">
      <Link href="/blog" className={cn("blog-category-filter__chip", active === "all" && "is-active")} aria-current={active === "all" ? "page" : undefined}>
        All
      </Link>
      {BLOG_CATEGORIES.map((cat) => {
        const n = getPostsByCategory(cat.slug).length;
        if (!n) return null;
        return (
          <Link
            key={cat.slug}
            href={`/blog/topic/${cat.slug}`}
            className={cn("blog-category-filter__chip", active === cat.slug && "is-active")}
            aria-current={active === cat.slug ? "page" : undefined}
          >
            {cat.label} <span className="opacity-60">{n}</span>
          </Link>
        );
      })}
    </nav>
  );
}
