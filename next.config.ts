import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true
  },
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;
