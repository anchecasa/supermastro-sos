import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
    ],
  },
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "@picovoice/porcupine-web",
        "@picovoice/web-voice-processor",
      ];
    }
    return config;
  },
};

export default nextConfig;
