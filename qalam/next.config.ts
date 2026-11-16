import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / WASM packages must stay outside the bundle on the server.
  serverExternalPackages: ["@electric-sql/pglite", "sharp", "pg", "bcryptjs"],
  async headers() {
    return [{ source: "/media/qalam/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
