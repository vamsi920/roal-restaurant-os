import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW_PATHS } from "@/lib/seo/robots-txt";
import { getSiteOrigin } from "@/lib/site-url";

export { ROBOTS_DISALLOW_PATHS };

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  const sitemap = origin ? `${origin}/sitemap.xml` : "/sitemap.xml";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap,
  };
}
