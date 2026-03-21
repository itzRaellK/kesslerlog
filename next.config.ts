import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    buildActivity: false,
  },
  experimental: {
    // Menos módulos ambíguos com barrel do lucide (ajuda HMR/RSC no dev).
    optimizePackageImports: ["lucide-react"],
  },
  webpack: (config, { dev, isServer }) => {
    // No dev, cache em disco do servidor costuma corromper no Windows e gerar
    // "__webpack_modules__[moduleId] is not a function" após hot reload.
    if (dev && isServer) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
