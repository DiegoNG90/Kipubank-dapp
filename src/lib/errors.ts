import { decodeErrorResult, type Hex } from "viem";
import { kipuBankAbi } from "@/lib/abis/kipubank";

const ERROR_MESSAGES: Record<string, (args?: readonly unknown[]) => string> = {
  InvalidAmount: () => "Amount must be greater than zero.",
  InsufficientBalance: () => "Insufficient USDC balance for this withdrawal.",
  WithdrawalAmountTooHigh: () =>
    "Withdrawal exceeds the per-transaction limit.",
  BankCapReached: () =>
    "Deposit would exceed the bank's total capacity (BANKCAP).",
  TokenNotSupported: (args) =>
    `Token not supported: ${String(args?.[0] ?? "unknown")}. Only USDC withdrawals are allowed.`,
  SwapFailed: () =>
    "Swap failed — received less USDC than the minimum slippage threshold.",
  TokenSwapNotSupported: (args) =>
    `No Uniswap V2 liquidity path for token ${String(args?.[0] ?? "unknown")}.`,
  InvalidContract: () => "Contract configuration is invalid.",
  FailureWithdrawal: () => "Native ETH transfer failed during withdrawal.",
  TokenTransferFailed: () => "ERC-20 token transfer failed.",
};

export function decodeKipuBankError(error: unknown): string {
  const data = extractRevertData(error);
  if (!data) {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return "Transaction failed with an unknown error.";
  }

  try {
    const decoded = decodeErrorResult({ abi: kipuBankAbi, data });
    const formatter = ERROR_MESSAGES[decoded.errorName];
    if (formatter) {
      return formatter(decoded.args);
    }
    return `Contract error: ${decoded.errorName}`;
  } catch {
    return "Transaction reverted with an unrecognized error.";
  }
}

function extractRevertData(error: unknown): Hex | undefined {
  if (!error || typeof error !== "object") return undefined;

  const candidates = [
    (error as { data?: Hex }).data,
    (error as { cause?: { data?: Hex } }).cause?.data,
    (error as { shortMessage?: string }).shortMessage,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("0x")) {
      return candidate as Hex;
    }
  }

  const walk = (value: unknown, depth = 0): Hex | undefined => {
    if (depth > 4 || !value || typeof value !== "object") return undefined;
    const record = value as Record<string, unknown>;
    if (typeof record.data === "string" && record.data.startsWith("0x")) {
      return record.data as Hex;
    }
    for (const nested of Object.values(record)) {
      const found = walk(nested, depth + 1);
      if (found) return found;
    }
    return undefined;
  };

  return walk(error);
}
