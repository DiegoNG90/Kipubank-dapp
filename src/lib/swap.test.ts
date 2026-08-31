import { describe, expect, it } from "vitest";
import { calculateMinOut } from "@/lib/swap";

describe("calculateMinOut", () => {
  it("reduces the estimate by the slippage bps", () => {
    expect(calculateMinOut(1_000_000n, 500n)).toBe(950_000n);
  });

  it("returns the full estimate when slippage is zero", () => {
    expect(calculateMinOut(2_000_000n, 0n)).toBe(2_000_000n);
  });

  it("floors toward zero on integer division", () => {
    expect(calculateMinOut(100n, 333n)).toBe(96n);
  });
});
