import { describe, expect, it } from "vitest";
import { truncateAddress, formatUsd } from "@/lib/utils";

const address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";

describe("truncateAddress", () => {
  it("keeps prefix and suffix with an ellipsis", () => {
    expect(truncateAddress(address, 4)).toBe("0x9488…93e4");
  });

  it("uses a longer prefix when chars is larger", () => {
    expect(truncateAddress(address, 6)).toBe("0x94880b…2F93e4");
  });
});

describe("formatUsd", () => {
  it("formats six-decimal USDC amounts with two fraction digits", () => {
    expect(formatUsd(1_500_000n)).toMatch(/^1[.,]50$/);
  });

  it("formats zero", () => {
    expect(formatUsd(0n)).toMatch(/^0[.,]00$/);
  });

  it("respects custom decimals", () => {
    expect(formatUsd(1_000_000_000_000_000_000n, 18)).toMatch(/^1[.,]00$/);
  });
});
