import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / WASM packages must stay outside the bundle on the server.
  serverExternalPackages: ["@electric-sql/pglite", "sharp", "pg", "bcryptjs"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
