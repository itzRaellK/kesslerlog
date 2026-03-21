import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  devIndicators: {
    buildActivity: false,
  },
  experimental: {
    // Só em produção: no dev o HMR + RSC costuma quebrar com lucide barrel
    // ("Cannot read properties of undefined (reading 'call')" no webpack).
    ...(isProd ? { optimizePackageImports: ["lucide-react"] as const } : {}),
  },
  webpack: (config, { dev }) => {
    // No dev, cache em disco costuma corromper no Windows após HMR.
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
