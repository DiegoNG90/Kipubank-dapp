import { describe, expect, it } from "vitest";
import {
  etherscanAddressUrl,
  etherscanTokenUrl,
  etherscanTxUrl,
  sanitizeTokenName,
  sanitizeTokenSymbol,
} from "@/lib/sanitize";

describe("sanitizeTokenSymbol", () => {
  it("returns TOKEN for empty input", () => {
    expect(sanitizeTokenSymbol(undefined)).toBe("TOKEN");
    expect(sanitizeTokenSymbol("")).toBe("TOKEN");
  });

  it("strips control characters", () => {
    expect(sanitizeTokenSymbol("US\x00DC")).toBe("USDC");
  });

  it("caps length to prevent spoofing", () => {
    expect(sanitizeTokenSymbol("A".repeat(50))).toHaveLength(12);
  });

  it("does not pass through HTML-like content unchanged beyond capping", () => {
    const result = sanitizeTokenSymbol("<script>alert(1)</script>");
    expect(result).not.toContain("<");
    expect(result.length).toBeLessThanOrEqual(12);
  });
});

describe("sanitizeTokenName", () => {
  it("caps long names", () => {
    expect(sanitizeTokenName("N".repeat(100))).toHaveLength(32);
  });
});

describe("etherscan URLs", () => {
  const validHash =
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const validAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  it("builds tx URLs for valid hashes", () => {
    expect(etherscanTxUrl(validHash)).toBe(
      `https://sepolia.etherscan.io/tx/${validHash}`,
    );
  });

  it("rejects invalid tx hashes", () => {
    expect(etherscanTxUrl("0x123")).toBeUndefined();
    expect(etherscanTxUrl("javascript:alert(1)")).toBeUndefined();
  });

  it("builds address URLs for valid addresses", () => {
    expect(etherscanAddressUrl(validAddress)).toBe(
      `https://sepolia.etherscan.io/address/${validAddress}`,
    );
  });

  it("builds token URLs for valid addresses", () => {
    expect(etherscanTokenUrl(validAddress)).toBe(
      `https://sepolia.etherscan.io/token/${validAddress}`,
    );
  });

  it("rejects invalid addresses", () => {
    expect(etherscanAddressUrl("not-an-address")).toBeUndefined();
  });
});
