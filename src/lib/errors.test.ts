import { encodeErrorResult, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { kipuBankAbi } from "@/lib/abis/kipubank";
import { SEPOLIA_USDC } from "@/lib/constants";
import { decodeKipuBankError } from "@/lib/errors";

const token = getAddress(SEPOLIA_USDC);

function revert(
  errorName: (typeof kipuBankAbi)[number]["name"],
  args: readonly unknown[] = [],
) {
  return encodeErrorResult({
    abi: kipuBankAbi,
    errorName,
    args,
  });
}

describe("decodeKipuBankError", () => {
  it.each([
    ["InvalidAmount", "Amount must be greater than zero."],
    ["InsufficientBalance", "Insufficient USDC balance for this withdrawal."],
    ["WithdrawalAmountTooHigh", "Withdrawal exceeds the per-transaction limit."],
    ["BankCapReached", "Deposit would exceed the bank's total capacity (BANKCAP)."],
    [
      "TokenNotSupported",
      `Token not supported: ${token}. Only USDC withdrawals are allowed.`,
    ],
    ["SwapFailed", "Swap failed — received less USDC than the minimum slippage threshold."],
    [
      "TokenSwapNotSupported",
      `No Uniswap V2 liquidity path for token ${token}.`,
    ],
    ["InvalidContract", "Contract configuration is invalid."],
    ["FailureWithdrawal", "Native ETH transfer failed during withdrawal."],
    ["TokenTransferFailed", "ERC-20 token transfer failed."],
  ] as const)("maps %s", (errorName, message) => {
    const args =
      errorName === "TokenNotSupported" || errorName === "TokenSwapNotSupported"
        ? [token]
        : errorName === "FailureWithdrawal"
          ? ["0x" as const]
          : [];
    expect(decodeKipuBankError({ data: revert(errorName, args) })).toBe(message);
  });

  it("walks nested cause.data to find revert data", () => {
    const data = revert("BankCapReached");

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
