import { buildArticleJsonLdGraph } from "@/lib/blog/json-ld";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  post: BlogPost;
};

export function BlogArticleJsonLd({ post }: Props) {
  const graph = buildArticleJsonLdGraph(post);
  if (!graph) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
