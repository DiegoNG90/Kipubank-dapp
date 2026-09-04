export type SecurityHeader = {
  key: string;
  value: string;
};

const DEFAULT_RPC_ORIGINS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
];

function uniqueOrigins(origins: string[]): string[] {
  return [...new Set(origins.filter(Boolean))];
}

export function buildConnectSrc(rpcUrls: string[] = []): string {
  const origins = uniqueOrigins([...DEFAULT_RPC_ORIGINS, ...rpcUrls]);
  return ["'self'", ...origins, "https://sepolia.etherscan.io", "wss:"].join(
    " ",
  );
}

export function buildSecurityHeaders(options?: {
  rpcUrls?: string[];
}): SecurityHeader[] {
  const connectSrc = buildConnectSrc(options?.rpcUrls);
  const cspReportOnly = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  return [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    {
      key: "Content-Security-Policy-Report-Only",
      value: cspReportOnly,
    },
  ];
}
