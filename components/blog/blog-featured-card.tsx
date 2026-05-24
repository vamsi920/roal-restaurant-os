import { BlogCard } from "@/components/blog/blog-card";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  post: BlogPost;
  /** @deprecated Layout is unified; prop ignored. */
  compact?: boolean;
};

export function BlogFeaturedCard({ post }: Props) {
  return <BlogCard post={post} tone="featured" />;
}
