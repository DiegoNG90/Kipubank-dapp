import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security/headers";

const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL?.trim();
const securityHeaders = buildSecurityHeaders({
  rpcUrls: rpcUrl ? [rpcUrl] : [],
});

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
