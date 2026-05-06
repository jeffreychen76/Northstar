import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config, { dev }) {
    if (!dev) {
      config.optimization.minimize = false;
    }

    return config;
  }
};

export default nextConfig;
