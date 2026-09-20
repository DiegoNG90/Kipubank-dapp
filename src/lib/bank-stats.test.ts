import { describe, expect, it } from "vitest";
import {
  calculateCapacityPct,
  calculateRemainingCapacity,
  isCapacityNearFull,
  mapBankStats,
} from "@/lib/bank-stats";

describe("mapBankStats", () => {
  it("maps contract read rows to named fields", () => {
    const usdc = "0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238";
    const stats = mapBankStats([
      { result: 10_000_000n },
      { result: 2_500_000n },
      { result: 12n },
      { result: 3n },
      { result: 500_000n },
      { result: 100n },
      { result: usdc },
      { result: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" },
      { result: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" },
      { result: "0x0000000000000000000000000000000000000001" },
    ]);

    expect(stats).toEqual({
      bankCap: 10_000_000n,
      totalDeposits: 2_500_000n,
      depositOps: 12n,
      withdrawOps: 3n,
      maxWithdrawal: 500_000n,
      slippageBps: 100n,
      usdc,
      router: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
      weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
      owner: "0x0000000000000000000000000000000000000001",
    });
  });

  it("returns an empty object when data is undefined", () => {
    expect(mapBankStats(undefined)).toEqual({});
  });
});

describe("calculateCapacityPct", () => {
  it("returns the percentage of bank cap used", () => {
    expect(calculateCapacityPct(10_000_000n, 2_500_000n)).toBe(25);
  });

  it("returns zero when bank cap is missing or zero", () => {
    expect(calculateCapacityPct(undefined, 1n)).toBe(0);
    expect(calculateCapacityPct(0n, 1n)).toBe(0);
  });
});

describe("calculateRemainingCapacity", () => {
  it("returns the difference between cap and deposits", () => {
    expect(calculateRemainingCapacity(10_000_000n, 2_500_000n)).toBe(
      7_500_000n,
    );
  });

  it("returns zero when deposits meet or exceed cap", () => {
    expect(calculateRemainingCapacity(10_000_000n, 10_000_000n)).toBe(0n);
    expect(calculateRemainingCapacity(10_000_000n, 11_000_000n)).toBe(0n);
  });

  it("returns zero when cap is missing", () => {
    expect(calculateRemainingCapacity(undefined, 1n)).toBe(0n);
  });
});

describe("isCapacityNearFull", () => {
  it("flags usage at or above the threshold", () => {
    expect(isCapacityNearFull(90)).toBe(true);
    expect(isCapacityNearFull(89.9)).toBe(false);
  });
});
