import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 15 espera um objeto em devIndicators (não boolean).
  devIndicators: {
    buildActivity: false,
  },
};

export default nextConfig;
