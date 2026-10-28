import { buildLlmsTxt } from "@/lib/seo/llms";

// Rebuilt hourly so newly published posts are listed on their day.
export const revalidate = 3600;

/** Plain-language site map for AI assistants and crawlers (llms.txt convention). */
export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
