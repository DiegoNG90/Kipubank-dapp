import { BPS_BASE, ZERO } from "@/lib/bigint";

export type BankStatsReadResult = {
  bankCap?: bigint;
  totalDeposits?: bigint;
  depositOps?: bigint;
  withdrawOps?: bigint;
  maxWithdrawal?: bigint;
  slippageBps?: bigint;
  usdc?: `0x${string}`;
  router?: `0x${string}`;
  weth?: `0x${string}`;
  owner?: `0x${string}`;
};

type ContractReadRow = { result?: unknown };

export function mapBankStats(
  data: readonly ContractReadRow[] | undefined,
): BankStatsReadResult {
  if (!data) return {};

  return {
    bankCap: data[0]?.result as bigint | undefined,
    totalDeposits: data[1]?.result as bigint | undefined,
    depositOps: data[2]?.result as bigint | undefined,
    withdrawOps: data[3]?.result as bigint | undefined,
    maxWithdrawal: data[4]?.result as bigint | undefined,
    slippageBps: data[5]?.result as bigint | undefined,
    usdc: data[6]?.result as `0x${string}` | undefined,
    router: data[7]?.result as `0x${string}` | undefined,
    weth: data[8]?.result as `0x${string}` | undefined,
    owner: data[9]?.result as `0x${string}` | undefined,
  };
}

export function calculateCapacityPct(
  bankCap: bigint | undefined,
  totalDeposits: bigint | undefined,
): number {
  if (!bankCap || totalDeposits === undefined || bankCap <= ZERO) return 0;
  return Number((totalDeposits * BPS_BASE) / bankCap) / 100;
}

export function calculateRemainingCapacity(
  bankCap: bigint | undefined,
  totalDeposits: bigint | undefined,
): bigint {
  if (!bankCap || totalDeposits === undefined) return ZERO;
  if (totalDeposits >= bankCap) return ZERO;
  return bankCap - totalDeposits;
}

export function isCapacityNearFull(capacityPct: number, threshold = 90): boolean {
  return capacityPct >= threshold;
}
