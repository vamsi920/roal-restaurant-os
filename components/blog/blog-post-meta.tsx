import { getCategoryLabel } from "@/lib/blog/categories";
import type { BlogCategorySlug } from "@/lib/blog/categories";
import { formatPostDate } from "@/lib/blog/index";
import { cn } from "@/lib/cn";

type Props = {
  categorySlug: BlogCategorySlug;
  readTimeMinutes: number;
  publishedAt: string;
  className?: string;
};

export function BlogPostMeta({ categorySlug, readTimeMinutes, publishedAt, className }: Props) {
  return (
    <div className={cn("blog-post-meta", className)}>
      <span className="chip">{getCategoryLabel(categorySlug)}</span>
      <span className="blog-post-meta__detail">
        {readTimeMinutes} min read · {formatPostDate(publishedAt)}
      </span>
    </div>
  );
}
