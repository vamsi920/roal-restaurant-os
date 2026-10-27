/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
    // Firebase Admin must load from node_modules at runtime, not through webpack.
    serverComponentsExternalPackages: ["firebase-admin", "@google-cloud/firestore"],
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
