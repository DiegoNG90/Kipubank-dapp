"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { erc20Abi } from "@/lib/abis/erc20";
import { kipuBankAbi } from "@/lib/abis/kipubank";
import {
  getKipuBankAddress,
  HISTORY_FETCH_TIMEOUT_MS,
  HISTORY_LOG_CHUNK_SIZE,
  MAX_HISTORY_ENTRIES,
  resolveHistoryFromBlock,
} from "@/lib/constants";
import {
  attachTimestamps,
  buildBlockRanges,
  buildHistoryEntries,
  filterDepositsBySender,
  newestFirstRanges,
  toEtherDepositLogs,
  toTokenDepositLogs,
  toTokenWithdrawLogs,
  toUsdcTransferLogs,
  type EtherDepositLog,
  type HistoryEntry,
  type TokenDepositLog,
  type TokenWithdrawLog,
  type UsdcTransferLog,
} from "@/lib/tx-history";
import { sanitizeTokenSymbol } from "@/lib/sanitize";

export const HISTORY_TIMEOUT_MESSAGE =
  "History lookup timed out after 7 seconds.";

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException(HISTORY_TIMEOUT_MESSAGE, "TimeoutError");
  }
}

export function useTxHistory(
  userAddress: `0x${string}` | undefined,
  usdcAddress: `0x${string}` | undefined,
) {
  const publicClient = usePublicClient();
  const bankAddress = getKipuBankAddress();

  return useQuery({
    queryKey: ["tx-history", bankAddress, userAddress, usdcAddress],
    enabled: !!publicClient && !!bankAddress && !!userAddress && !!usdcAddress,
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!publicClient || !bankAddress || !userAddress || !usdcAddress) {
        throw new Error("History query is missing required addresses.");
      }

      const timeout = new AbortController();
      const onParentAbort = () => timeout.abort();
      signal.addEventListener("abort", onParentAbort);

      let timer: number | undefined;
      const timeoutError = new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => {
          timeout.abort();
          reject(new DOMException(HISTORY_TIMEOUT_MESSAGE, "TimeoutError"));
        }, HISTORY_FETCH_TIMEOUT_MS);
      });
      timeoutError.catch(() => undefined);

      try {
        return await Promise.race([
          loadHistory({
            publicClient,
            bankAddress,
            userAddress,
            usdcAddress,
            signal: timeout.signal,
          }),
          timeoutError,
        ]);
      } finally {
        if (timer !== undefined) window.clearTimeout(timer);
        signal.removeEventListener("abort", onParentAbort);
      }
    },
  });
}

type PublicClient = NonNullable<ReturnType<typeof usePublicClient>>;

async function loadHistory({
  publicClient,
  bankAddress,
  userAddress,
  usdcAddress,
  signal,
}: {
  publicClient: PublicClient;
  bankAddress: `0x${string}`;
  userAddress: `0x${string}`;
  usdcAddress: `0x${string}`;
  signal: AbortSignal;
}): Promise<HistoryEntry[]> {
  const currentBlock = await publicClient.getBlockNumber();
  throwIfAborted(signal);

  const fromBlock = resolveHistoryFromBlock(currentBlock);
  const ranges = newestFirstRanges(
    buildBlockRanges(fromBlock, currentBlock, HISTORY_LOG_CHUNK_SIZE),
  );

  const etherDeposits: EtherDepositLog[] = [];
  const tokenDeposits: TokenDepositLog[] = [];
  const withdrawals: TokenWithdrawLog[] = [];
  let timedOut = false;

  for (const range of ranges) {
    if (signal.aborted) {
      timedOut = true;
      break;
    }

    try {
      const [etherChunk, tokenChunk, withdrawChunk] = await Promise.all([
        publicClient.getContractEvents({
          address: bankAddress,
          abi: kipuBankAbi,
          eventName: "SuccessfulEtherDeposit",
          fromBlock: range.from,
          toBlock: range.to,
        }),
        publicClient.getContractEvents({
          address: bankAddress,
          abi: kipuBankAbi,
          eventName: "SuccessfulTokenDeposit",
          fromBlock: range.from,
          toBlock: range.to,
        }),
        publicClient.getContractEvents({
          address: bankAddress,
          abi: kipuBankAbi,
          eventName: "SuccessfulTokenWithdrawal",
          args: { _sender: userAddress },
          fromBlock: range.from,
          toBlock: range.to,
        }),
      ]);

      etherDeposits.push(...toEtherDepositLogs(etherChunk));
      tokenDeposits.push(...toTokenDepositLogs(tokenChunk));
      withdrawals.push(...toTokenWithdrawLogs(withdrawChunk));
    } catch (error) {
      if (signal.aborted) {
        timedOut = true;
        break;
      }
      throw error;
    }

    const userHits =
      filterDepositsBySender(etherDeposits, userAddress).length +
      filterDepositsBySender(tokenDeposits, userAddress).length +
      withdrawals.length;

    if (userHits >= MAX_HISTORY_ENTRIES) break;
  }

  if (
    timedOut &&
    etherDeposits.length === 0 &&
    tokenDeposits.length === 0 &&
    withdrawals.length === 0
  ) {
    throw new DOMException(HISTORY_TIMEOUT_MESSAGE, "TimeoutError");
  }

  const tokenAddresses = [
    ...new Set(
      filterDepositsBySender(tokenDeposits, userAddress).map((log) =>
        log.args._tokenAddress.toLowerCase(),
      ),
    ),
  ] as `0x${string}`[];

  const symbolsByAddress: Record<string, string> = {
    [usdcAddress.toLowerCase()]: "USDC",
  };
  const decimalsByAddress: Record<string, number> = {
    [usdcAddress.toLowerCase()]: 6,
  };

  await Promise.all(
    tokenAddresses.map(async (tokenAddress) => {
      const [symbol, decimals] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "decimals",
        }),
      ]);
      symbolsByAddress[tokenAddress.toLowerCase()] =
        sanitizeTokenSymbol(symbol);
      decimalsByAddress[tokenAddress.toLowerCase()] = Number(decimals);
    }),
  );

  const preview = buildHistoryEntries({
    etherDeposits,
    tokenDeposits,
    withdrawals,
    userAddress,
    usdcTransfers: [],
    symbolsByAddress,
    decimalsByAddress,
    maxEntries: MAX_HISTORY_ENTRIES,
  });

  const usdcTransfers = await fetchUsdcTransfersForEntries({
    publicClient,
    bankAddress,
    usdcAddress,
    entries: preview,
    signal,
  });

  const entries = buildHistoryEntries({
    etherDeposits,
    tokenDeposits,
    withdrawals,
    userAddress,
    usdcTransfers,
    symbolsByAddress,
    decimalsByAddress,
    maxEntries: MAX_HISTORY_ENTRIES,
  });

  const uniqueBlocks = [...new Set(entries.map((entry) => entry.blockNumber))];
  const timestampsByBlock: Record<string, number> = {};

  await Promise.all(
    uniqueBlocks.map(async (blockNumber) => {
      if (signal.aborted) return;
      const block = await publicClient.getBlock({ blockNumber });
      timestampsByBlock[blockNumber.toString()] = Number(block.timestamp);
    }),
  );

  return attachTimestamps(entries, timestampsByBlock);
}

async function fetchUsdcTransfersForEntries({
  publicClient,
  bankAddress,
  usdcAddress,
  entries,
  signal,
}: {
  publicClient: PublicClient;
  bankAddress: `0x${string}`;
  usdcAddress: `0x${string}`;
  entries: HistoryEntry[];
  signal: AbortSignal;
}): Promise<UsdcTransferLog[]> {
  if (entries.length === 0 || signal.aborted) return [];

  const blockNumbers = entries.map((entry) => entry.blockNumber);
  const fromBlock = blockNumbers.reduce((min, block) =>
    block < min ? block : min,
  );
  const toBlock = blockNumbers.reduce((max, block) =>
    block > max ? block : max,
  );

  const ranges = newestFirstRanges(
    buildBlockRanges(fromBlock, toBlock, HISTORY_LOG_CHUNK_SIZE),
  );
  const transfers: UsdcTransferLog[] = [];

  for (const range of ranges) {
    if (signal.aborted) break;
    const chunk = await publicClient.getContractEvents({
      address: usdcAddress,
      abi: erc20Abi,
      eventName: "Transfer",
      args: { to: bankAddress },
      fromBlock: range.from,
      toBlock: range.to,
    });
    transfers.push(...toUsdcTransferLogs(chunk));
  }

  return transfers;
}
