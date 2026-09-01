import { formatUnits } from "viem";
import { ZERO } from "@/lib/bigint";
import { formatUsd } from "@/lib/utils";

export function validateWithdrawAmount(
  parsedAmount: bigint | undefined,
  userUsdc: bigint | undefined,
  maxWithdrawal: bigint | undefined,
): string | null {
  if (!parsedAmount || parsedAmount <= ZERO) {
    return "Enter a valid amount.";
  }
  if (userUsdc !== undefined && parsedAmount > userUsdc) {
    return `Insufficient balance. You have $${formatUsd(userUsdc)} USDC.`;
  }
  if (maxWithdrawal !== undefined && parsedAmount > maxWithdrawal) {
    return `Exceeds per-transaction limit of $${formatUsd(maxWithdrawal)}.`;
  }
  return null;
}

export function maxWithdrawAmount(
  userUsdc: bigint,
  maxWithdrawal: bigint | undefined,
): bigint {
  const cap = maxWithdrawal ?? userUsdc;
  return userUsdc < cap ? userUsdc : cap;
}

export function formatMaxWithdrawInput(
  userUsdc: bigint,
  maxWithdrawal: bigint | undefined,
  decimals: number,
): string {
  return formatUnits(maxWithdrawAmount(userUsdc, maxWithdrawal), decimals);
}
