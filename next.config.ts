import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  // Force a unique build ID on every deployment to bust browser/CDN caches
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
