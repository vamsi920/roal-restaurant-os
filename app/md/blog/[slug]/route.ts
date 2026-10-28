import { getPostBySlug } from "@/lib/blog";
import { buildPostMarkdown } from "@/lib/seo/llms";

// Served at /blog/<slug>.md through a rewrite in next.config.mjs.
export const revalidate = 3600;

export function GET(_req: Request, { params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) return new Response("Not found", { status: 404 });
  return new Response(buildPostMarkdown(post), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      Link: `<https://tryroal.com/blog/${post.slug}>; rel="canonical"`,
      "X-Robots-Tag": "noindex",
    },
  });
}
