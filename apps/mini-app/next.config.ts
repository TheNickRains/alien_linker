import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@alien_org/react", "@alien_org/bridge", "@alien_org/auth-client"],
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
