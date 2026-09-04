import { describe, expect, it } from "vitest";
import { SEPOLIA_USDC, SEPOLIA_WETH } from "@/lib/constants";
import { buildHumanPath, describeQuote } from "@/lib/quote";

const usdc = SEPOLIA_USDC as `0x${string}`;
const weth = SEPOLIA_WETH as `0x${string}`;
const token = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4" as `0x${string}`;

describe("buildHumanPath", () => {
  it("labels ETH path as ETH → WETH → USDC", () => {
    const path = [weth, usdc] as const;
    const label = buildHumanPath(path, { [usdc.toLowerCase()]: "USDC" }, {
      treatFirstAsEth: true,
    });
    expect(label).toBe("ETH → WETH → USDC");
  });

  it("labels token path with sanitized symbols", () => {
    const path = [token, weth, usdc] as const;
    const label = buildHumanPath(path, {
      [token.toLowerCase()]: "DAI",
      [usdc.toLowerCase()]: "USDC",
    });
    expect(label).toBe("DAI → WETH → USDC");
  });
});

describe("describeQuote", () => {
  it("builds a full quote view model", () => {
    const vm = describeQuote({
      amountIn: 1_000_000_000_000_000_000n,
      decimalsIn: 18,
      symbolIn: "ETH",
      estimatedOut: 2_500_000n,
      slippageBps: 50n,
      path: [weth, usdc],
      symbolsByAddress: { [usdc.toLowerCase()]: "USDC" },
      treatFirstAsEth: true,
    });

    expect(vm.pathLabel).toBe("ETH → WETH → USDC");
    expect(vm.estimatedOutLabel).toMatch(/\$2[.,]50/);
    expect(vm.minOutLabel).toMatch(/\$2[.,]3/);
    expect(vm.slippageLabel).toBe("0.50%");
    expect(vm.noLiquidity).toBe(false);
    expect(vm.warnings).toHaveLength(0);
  });

  it("flags missing liquidity and cap overflow", () => {
    const noLiq = describeQuote({
      amountIn: 100n,
      decimalsIn: 6,
      symbolIn: "USDC",
      slippageBps: 50n,
      path: [usdc],
      symbolsByAddress: { [usdc.toLowerCase()]: "USDC" },
    });
    expect(noLiq.noLiquidity).toBe(true);
    expect(noLiq.warnings[0]).toMatch(/liquidity/i);

    const overCap = describeQuote({
      amountIn: 100n,
      decimalsIn: 6,
      symbolIn: "USDC",
      estimatedOut: 5_000_000n,
      slippageBps: 50n,
      path: [usdc],
      symbolsByAddress: { [usdc.toLowerCase()]: "USDC" },
      remainingCapacity: 1_000_000n,
    });
    expect(overCap.wouldExceedRemainingCap).toBe(true);
    expect(overCap.warnings[0]).toMatch(/capacity/i);
  });
});
