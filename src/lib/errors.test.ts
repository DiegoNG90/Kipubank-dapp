import { encodeErrorResult, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { kipuBankAbi } from "@/lib/abis/kipubank";
import { SEPOLIA_USDC } from "@/lib/constants";
import { decodeKipuBankError } from "@/lib/errors";

const token = getAddress(SEPOLIA_USDC);

describe("decodeKipuBankError", () => {
  it("maps known custom errors from revert data", () => {
    const data = encodeErrorResult({
      abi: kipuBankAbi,
      errorName: "InvalidAmount",
      args: [],
    });

    expect(decodeKipuBankError({ data })).toBe(
      "Amount must be greater than zero.",
    );
  });

  it("formats errors with arguments", () => {
    const data = encodeErrorResult({
      abi: kipuBankAbi,
      errorName: "TokenNotSupported",
      args: [token],
    });

    expect(decodeKipuBankError({ data })).toBe(
      `Token not supported: ${token}. Only USDC withdrawals are allowed.`,
    );
  });

  it("walks nested cause.data to find revert data", () => {
    const data = encodeErrorResult({
      abi: kipuBankAbi,
      errorName: "BankCapReached",
      args: [],
    });

    expect(
      decodeKipuBankError({ cause: { cause: { data } } }),
    ).toBe("Deposit would exceed the bank's total capacity (BANKCAP).");
  });

  it("falls back to Error.message when no revert data exists", () => {
    expect(decodeKipuBankError(new Error("User rejected the request."))).toBe(
      "User rejected the request.",
    );
  });

  it("returns a generic message for unknown failures", () => {
    expect(decodeKipuBankError(null)).toBe(
      "Transaction failed with an unknown error.",
    );
  });

  it("handles unrecognized revert selectors", () => {
    expect(decodeKipuBankError({ data: "0xdeadbeef" })).toBe(
      "Transaction reverted with an unrecognized error.",
    );
  });
});
