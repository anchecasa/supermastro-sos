import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  serverExternalPackages: ["pg"],
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;

// initOpenNextCloudflareForDev() omitted: it routes server actions through a stale
// Wrangler worker bundle with placeholder Supabase env. Use `npm run preview` for
// Cloudflare parity; `next dev` reads web/.env.local directly.
