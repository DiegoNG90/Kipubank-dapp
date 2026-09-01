import { parseUnits } from "viem";
import { ZERO } from "@/lib/bigint";

export function parseAmountInput(
  amount: string,
  decimals: number,
): bigint | undefined {
  try {
    if (!amount || Number(amount) <= 0) return undefined;
    return parseUnits(amount, decimals);
  } catch {
    return undefined;
  }
}

export function isPositiveAmount(
  parsed: bigint | undefined,
): parsed is bigint {
  return parsed !== undefined && parsed > ZERO;
}
