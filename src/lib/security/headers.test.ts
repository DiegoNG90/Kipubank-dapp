import { describe, expect, it } from "vitest";
import { buildConnectSrc, buildSecurityHeaders } from "@/lib/security/headers";

describe("buildConnectSrc", () => {
  it("includes self, default RPCs, etherscan, and wss", () => {
    const src = buildConnectSrc();
    expect(src).toContain("'self'");
    expect(src).toContain("https://ethereum-sepolia-rpc.publicnode.com");
    expect(src).toContain("https://sepolia.etherscan.io");
    expect(src).toContain("wss:");
  });

  it("adds custom RPC URLs from env", () => {
    const src = buildConnectSrc(["https://eth-sepolia.g.alchemy.com/v2/demo"]);
    expect(src).toContain("https://eth-sepolia.g.alchemy.com/v2/demo");
  });
});

describe("buildSecurityHeaders", () => {
  it("returns basic security headers and CSP report-only", () => {
    const headers = buildSecurityHeaders();
    const keys = headers.map((h) => h.key);

    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Permissions-Policy");
    expect(keys).toContain("Content-Security-Policy-Report-Only");
    expect(keys).not.toContain("Content-Security-Policy");
  });

  it("embeds custom RPC in CSP connect-src", () => {
    const headers = buildSecurityHeaders({
      rpcUrls: ["https://custom-rpc.example.com"],
    });
    const csp = headers.find(
      (h) => h.key === "Content-Security-Policy-Report-Only",
    );
    expect(csp?.value).toContain("https://custom-rpc.example.com");
    expect(csp?.value).toContain("frame-ancestors 'none'");
  });
});
