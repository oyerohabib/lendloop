import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Convex + Clerk client providers use non-deterministic IDs; keep classic
  // dynamic rendering rather than Cache Components prerender.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
