import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // Vercel images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
