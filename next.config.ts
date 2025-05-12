import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  output: 'standalone',
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  redirects: process.env.NEXT_PUBLIC_BASE_PATH ? async () => {
    return [
      {
        source: "/",
        destination: process.env.NEXT_PUBLIC_BASE_PATH || "",
        permanent: true, // Set to true for a 308 redirect, false for a 307 redirect
      },
    ];
  } : undefined,
};

export default nextConfig;
