import { describe, expect, it } from "vitest";
import { parseAmountInput, isPositiveAmount } from "@/lib/amounts";

describe("parseAmountInput", () => {
  it("parses a positive decimal string", () => {
    expect(parseAmountInput("1.5", 6)).toBe(1_500_000n);
  });

  it("returns undefined for empty or non-positive input", () => {
    expect(parseAmountInput("", 6)).toBeUndefined();
    expect(parseAmountInput("0", 6)).toBeUndefined();
    expect(parseAmountInput("-1", 6)).toBeUndefined();
  });

  it("returns undefined for invalid decimals", () => {
    expect(parseAmountInput("not-a-number", 6)).toBeUndefined();
  });
});

describe("isPositiveAmount", () => {
  it("narrows positive bigint values", () => {
    expect(isPositiveAmount(1n)).toBe(true);
    expect(isPositiveAmount(0n)).toBe(false);
    expect(isPositiveAmount(undefined)).toBe(false);
  });
});
