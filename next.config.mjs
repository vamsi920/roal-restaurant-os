/** @type {import('next').NextConfig} */
const nextConfig = {
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
