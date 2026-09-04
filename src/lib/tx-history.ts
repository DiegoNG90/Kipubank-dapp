import { formatUnits } from "viem";
import { ETH_DECIMALS, USDC_DECIMALS } from "@/lib/constants";
import { sanitizeTokenSymbol } from "@/lib/sanitize";
import { formatUsd } from "@/lib/utils";

export type HistoryEntryType = "deposit-eth" | "deposit-token" | "withdraw";

export type HistoryEntry = {
  type: HistoryEntryType;
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp?: number;
  tokenAddress?: `0x${string}`;
  symbol: string;
  inputAmount: bigint;
  inputDecimals: number;
  creditedUsdc?: bigint;
};

export type BlockRange = {
  from: bigint;
  to: bigint;
};

export type UsdcTransferLog = {
  transactionHash: `0x${string}`;
  args: {
    value: bigint;
  };
};

export type EtherDepositLog = {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  args: {
    _sender: `0x${string}`;
    _deposit: bigint;
  };
};

export type TokenDepositLog = {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  args: {
    _sender: `0x${string}`;
    _tokenAddress: `0x${string}`;
    _amount: bigint;
  };
};

export type TokenWithdrawLog = {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  args: {
    _sender: `0x${string}`;
    _tokenAddress: `0x${string}`;
    _amount: bigint;
  };
};

export function buildBlockRanges(
  fromBlock: bigint,
  toBlock: bigint,
  chunkSize: bigint,
): BlockRange[] {
  if (chunkSize <= 0n || fromBlock > toBlock) return [];

  const ranges: BlockRange[] = [];
  let start = fromBlock;

  while (start <= toBlock) {
    const end = start + chunkSize - 1n > toBlock ? toBlock : start + chunkSize - 1n;
    ranges.push({ from: start, to: end });
    start = end + 1n;
  }

  return ranges;
}

export function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function filterDepositsBySender<
  T extends { args: { _sender: `0x${string}` } },
>(logs: T[], userAddress: `0x${string}`): T[] {
  return logs.filter((log) => addressesEqual(log.args._sender, userAddress));
}

export function normalizeEtherDeposits(logs: EtherDepositLog[]): HistoryEntry[] {
  return logs.map((log) => ({
    type: "deposit-eth",
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    symbol: "ETH",
    inputAmount: log.args._deposit,
    inputDecimals: ETH_DECIMALS,
  }));
}

export function normalizeTokenDeposits(
  logs: TokenDepositLog[],
  symbolsByAddress: Record<string, string> = {},
  decimalsByAddress: Record<string, number> = {},
): HistoryEntry[] {
  return logs.map((log) => {
    const token = log.args._tokenAddress.toLowerCase();
    return {
      type: "deposit-token",
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      tokenAddress: log.args._tokenAddress,
      symbol: sanitizeTokenSymbol(symbolsByAddress[token]),
      inputAmount: log.args._amount,
      inputDecimals: decimalsByAddress[token] ?? USDC_DECIMALS,
    };
  });
}

export function normalizeWithdrawals(
  logs: TokenWithdrawLog[],
  symbolsByAddress: Record<string, string> = {},
): HistoryEntry[] {
  return logs.map((log) => ({
    type: "withdraw",
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    tokenAddress: log.args._tokenAddress,
    symbol: sanitizeTokenSymbol(symbolsByAddress[log.args._tokenAddress.toLowerCase()] ?? "USDC"),
    inputAmount: log.args._amount,
    inputDecimals: USDC_DECIMALS,
    creditedUsdc: log.args._amount,
  }));
}

export function mergeCreditedFromUsdcTransfers(
  entries: HistoryEntry[],
  transfers: UsdcTransferLog[],
): HistoryEntry[] {
  const creditedByTx = new Map<string, bigint>();

  for (const transfer of transfers) {
    const key = transfer.transactionHash.toLowerCase();
    creditedByTx.set(key, (creditedByTx.get(key) ?? 0n) + transfer.args.value);
  }

  return entries.map((entry) => {
    if (entry.type === "withdraw") return entry;
    const credited = creditedByTx.get(entry.txHash.toLowerCase());
    return credited !== undefined ? { ...entry, creditedUsdc: credited } : entry;
  });
}

export function attachTimestamps(
  entries: HistoryEntry[],
  timestampsByBlock: Record<string, number>,
): HistoryEntry[] {
  return entries.map((entry) => ({
    ...entry,
    timestamp: timestampsByBlock[entry.blockNumber.toString()],
  }));
}

export function sortHistoryDesc(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort((a, b) => {
    if (a.blockNumber === b.blockNumber) {
      return a.txHash < b.txHash ? 1 : -1;
    }
    return a.blockNumber > b.blockNumber ? -1 : 1;
  });
}

export function limitHistoryEntries(
  entries: HistoryEntry[],
  maxEntries: number,
): HistoryEntry[] {
  return entries.slice(0, maxEntries);
}

export function formatHistoryInputAmount(entry: HistoryEntry): string {
  return `${formatUnits(entry.inputAmount, entry.inputDecimals)} ${entry.symbol}`;
}

export function formatHistoryCreditedUsdc(creditedUsdc?: bigint): string {
  if (creditedUsdc === undefined) return "—";
  return `$${formatUsd(creditedUsdc, USDC_DECIMALS)}`;
}

export function formatHistoryTypeLabel(type: HistoryEntryType): string {
  switch (type) {
    case "deposit-eth":
      return "Deposit ETH";
    case "deposit-token":
      return "Deposit token";
    case "withdraw":
      return "Withdraw USDC";
  }
}

export function formatRelativeTime(timestamp?: number, nowMs = Date.now()): string {
  if (timestamp === undefined) return "—";
  const diffSec = Math.max(0, Math.floor((nowMs - timestamp * 1000) / 1000));

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86_400)}d ago`;
}

export function formatAbsoluteTime(timestamp?: number): string {
  if (timestamp === undefined) return "Unknown time";
  return new Date(timestamp * 1000).toLocaleString();
}

export function buildHistoryEntries(input: {
  etherDeposits: EtherDepositLog[];
  tokenDeposits: TokenDepositLog[];
  withdrawals: TokenWithdrawLog[];
  userAddress: `0x${string}`;
  usdcTransfers: UsdcTransferLog[];
  symbolsByAddress?: Record<string, string>;
  decimalsByAddress?: Record<string, number>;
  timestampsByBlock?: Record<string, number>;
  maxEntries: number;
}): HistoryEntry[] {
  const userEtherDeposits = filterDepositsBySender(
    input.etherDeposits,
    input.userAddress,
  );
  const userTokenDeposits = filterDepositsBySender(
    input.tokenDeposits,
    input.userAddress,
  );

  const merged = mergeCreditedFromUsdcTransfers(
    [
      ...normalizeEtherDeposits(userEtherDeposits),
      ...normalizeTokenDeposits(
        userTokenDeposits,
        input.symbolsByAddress,
        input.decimalsByAddress,
      ),
      ...normalizeWithdrawals(input.withdrawals, input.symbolsByAddress),
    ],
    input.usdcTransfers,
  );

  const withTimestamps = attachTimestamps(
    merged,
    input.timestampsByBlock ?? {},
  );

  return limitHistoryEntries(sortHistoryDesc(withTimestamps), input.maxEntries);
}
