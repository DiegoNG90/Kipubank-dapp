import { describe, expect, it } from "vitest";
import {
  formatMaxWithdrawInput,
  maxWithdrawAmount,
  validateWithdrawAmount,
} from "@/lib/withdraw";

describe("validateWithdrawAmount", () => {
  it("requires a positive parsed amount", () => {
    expect(validateWithdrawAmount(undefined, 1_000_000n, 500_000n)).toBe(
      "Enter a valid amount.",
    );
  });

  it("rejects amounts above the user balance", () => {
    expect(validateWithdrawAmount(2_000_000n, 1_000_000n, 5_000_000n)).toMatch(
      /Insufficient balance/i,
    );
  });

  it("rejects amounts above the per-transaction limit", () => {
    expect(validateWithdrawAmount(600_000n, 1_000_000n, 500_000n)).toMatch(
      /Exceeds per-transaction limit/i,
    );
  });

  it("returns null for a valid amount", () => {
    expect(validateWithdrawAmount(400_000n, 1_000_000n, 500_000n)).toBeNull();
  });
});

describe("maxWithdrawAmount", () => {
  it("uses the lower of balance and per-tx cap", () => {
    expect(maxWithdrawAmount(1_000_000n, 500_000n)).toBe(500_000n);
    expect(maxWithdrawAmount(300_000n, 500_000n)).toBe(300_000n);
  });

  it("uses the full balance when no cap is configured", () => {
    expect(maxWithdrawAmount(1_000_000n, undefined)).toBe(1_000_000n);
  });
});

describe("formatMaxWithdrawInput", () => {
  it("formats the capped max as a decimal string", () => {
    expect(formatMaxWithdrawInput(1_000_000n, 500_000n, 6)).toBe("0.5");
  });
});
