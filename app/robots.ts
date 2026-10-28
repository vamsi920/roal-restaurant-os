import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW_PATHS } from "@/lib/seo/robots-txt";
import { getSiteOrigin } from "@/lib/site-url";

export { ROBOTS_DISALLOW_PATHS };

/** AI search and user-fetch crawlers: these decide whether answer engines can cite us. */
export const AI_SEARCH_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "DuckAssistBot",
  "MistralAI-User",
  "Bravebot",
  "YouBot",
  "Kagibot",
  "PhindBot",
  "Applebot",
  "Amazonbot",
] as const;

/** Training and model crawlers: allowed by choice (blocking them would not help citations). */
export const AI_TRAINING_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
  "cohere-ai",
  "Timpibot",
] as const;

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  const sitemap = origin ? `${origin}/sitemap.xml` : "/sitemap.xml";
  const disallow = [...ROBOTS_DISALLOW_PATHS];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: [...AI_SEARCH_AGENTS], allow: "/", disallow },
      { userAgent: [...AI_TRAINING_AGENTS], allow: "/", disallow },
    ],
    sitemap,
  };
}
