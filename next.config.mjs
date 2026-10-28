/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
    // Firebase Admin must load from node_modules at runtime, not through webpack.
    serverComponentsExternalPackages: ["firebase-admin", "@google-cloud/firestore"],
  },
  // Markdown copies of blog posts for AI agents: /blog/<slug>.md
  async rewrites() {
    return [{ source: "/blog/:slug.md", destination: "/md/blog/:slug" }];
  },
  async headers() {
    return [
      {
        source: "/:path(llms.txt|llms-full.txt|ai.txt)",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
  // Avoid stale webpack module maps in dev (fixes sporadic
  // "__webpack_modules__[moduleId] is not a function" after HMR/edits).
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
