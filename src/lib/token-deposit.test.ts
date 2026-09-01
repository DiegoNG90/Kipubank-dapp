import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { SEPOLIA_USDC, SEPOLIA_WETH } from "@/lib/constants";
import {
  buildEthSwapPath,
  buildTokenSwapPath,
  isUsdcToken,
  needsTokenApproval,
} from "@/lib/token-deposit";

const usdc = getAddress(SEPOLIA_USDC);
const otherToken = "0x00000000000000000000000000000000000000aa" as const;

describe("isUsdcToken", () => {
  it("matches the canonical Sepolia USDC address", () => {
    expect(isUsdcToken(SEPOLIA_USDC)).toBe(true);
  });

  it("matches the on-chain USDC address from the bank contract", () => {
    expect(isUsdcToken(otherToken, usdc)).toBe(false);
    expect(isUsdcToken(usdc, usdc)).toBe(true);
  });
});

describe("needsTokenApproval", () => {
  it("requires approval when allowance is missing or too low", () => {
    expect(needsTokenApproval(100n, undefined)).toBe(true);
    expect(needsTokenApproval(100n, 50n)).toBe(true);
  });

  it("skips approval when allowance is sufficient", () => {
    expect(needsTokenApproval(100n, 100n)).toBe(false);
    expect(needsTokenApproval(100n, 200n)).toBe(false);
  });

  it("returns false when there is no parsed amount", () => {
    expect(needsTokenApproval(undefined, 200n)).toBe(false);
  });
});

describe("swap paths", () => {
  it("builds the ETH to USDC path", () => {
    expect(buildEthSwapPath(usdc)).toEqual([SEPOLIA_WETH, usdc]);
  });

  it("builds the ERC-20 to USDC path through WETH", () => {
    expect(buildTokenSwapPath(otherToken, usdc)).toEqual([
      otherToken,
      SEPOLIA_WETH,
      usdc,
    ]);
  });
});
