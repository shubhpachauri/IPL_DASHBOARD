import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure static optimization is disabled for SSR
  trailingSlash: false,
  // Configure caching for better SSR performance
  cacheHandler: undefined,
  cacheMaxMemorySize: 0,
  // Enable server-side data fetching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
