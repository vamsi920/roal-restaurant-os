import { BlogCard } from "@/components/blog/blog-card";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  post: BlogPost;
  compact?: boolean;
};

export function BlogPostCard({ post, compact }: Props) {
  return <BlogCard post={post} compact={compact} />;
}
