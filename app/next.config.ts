import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },

  // v2: bumped version prefix ensures old CDN/browser caches can never serve
  // stale JS/CSS even if they ignore the content-hash filename change.
  generateBuildId: async () => `v3.1-final-${Date.now()}`,

  // Force no-cache on all HTML page responses.
  // Next.js static assets under /_next/static/ are already immutably
  // cache-busted by their content hash — we leave those alone.
  async headers() {
    return [
      {
        // Match all pages EXCEPT Next.js static asset paths
        source: "/((?!_next/static|_next/image|favicon\\.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Pragma",  value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
