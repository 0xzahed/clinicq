import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Live dashboard — never serve cached API responses. */
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
