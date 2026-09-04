"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { erc20Abi } from "@/lib/abis/erc20";
import { kipuBankAbi } from "@/lib/abis/kipubank";
import {
  getKipuBankAddress,
  HISTORY_LOG_CHUNK_SIZE,
  MAX_HISTORY_ENTRIES,
  resolveHistoryFromBlock,
} from "@/lib/constants";
import { attachTimestamps, buildBlockRanges, buildHistoryEntries } from "@/lib/tx-history";
import { sanitizeTokenSymbol } from "@/lib/sanitize";

async function fetchEventsInChunks<T>(
  fetchChunk: (fromBlock: bigint, toBlock: bigint) => Promise<T[]>,
  fromBlock: bigint,
  toBlock: bigint,
  chunkSize: bigint,
): Promise<T[]> {
  const ranges = buildBlockRanges(fromBlock, toBlock, chunkSize);
  const results: T[] = [];

  for (const range of ranges) {
    const chunk = await fetchChunk(range.from, range.to);
    results.push(...chunk);
  }

  return results;
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
    queryFn: async () => {
      if (!publicClient || !bankAddress || !userAddress || !usdcAddress) {
        throw new Error("History query is missing required addresses.");
      }

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = resolveHistoryFromBlock(currentBlock);

      const [
        etherDeposits,
        tokenDeposits,
        withdrawals,
        usdcTransfers,
      ] = await Promise.all([
        fetchEventsInChunks(
          (from, to) =>
            publicClient.getContractEvents({
              address: bankAddress,
              abi: kipuBankAbi,
              eventName: "SuccessfulEtherDeposit",
              fromBlock: from,
              toBlock: to,
            }),
          fromBlock,
          currentBlock,
          HISTORY_LOG_CHUNK_SIZE,
        ),
        fetchEventsInChunks(
          (from, to) =>
            publicClient.getContractEvents({
              address: bankAddress,
              abi: kipuBankAbi,
              eventName: "SuccessfulTokenDeposit",
              fromBlock: from,
              toBlock: to,
            }),
          fromBlock,
          currentBlock,
          HISTORY_LOG_CHUNK_SIZE,
        ),
        fetchEventsInChunks(
          (from, to) =>
            publicClient.getContractEvents({
              address: bankAddress,
              abi: kipuBankAbi,
              eventName: "SuccessfulTokenWithdrawal",
              args: { _sender: userAddress },
              fromBlock: from,
              toBlock: to,
            }),
          fromBlock,
          currentBlock,
          HISTORY_LOG_CHUNK_SIZE,
        ),
        fetchEventsInChunks(
          (from, to) =>
            publicClient.getContractEvents({
              address: usdcAddress,
              abi: erc20Abi,
              eventName: "Transfer",
              args: { to: bankAddress },
              fromBlock: from,
              toBlock: to,
            }),
          fromBlock,
          currentBlock,
          HISTORY_LOG_CHUNK_SIZE,
        ),
      ]);

      const tokenAddresses = [
        ...new Set(
          tokenDeposits.map((log) => log.args._tokenAddress.toLowerCase()),
        ),
      ] as `0x${string}`[];

      const symbolsByAddress: Record<string, string> = {};
      const decimalsByAddress: Record<string, number> = {};

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

      symbolsByAddress[usdcAddress.toLowerCase()] = "USDC";
      decimalsByAddress[usdcAddress.toLowerCase()] = 6;

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
          const block = await publicClient.getBlock({ blockNumber });
          timestampsByBlock[blockNumber.toString()] = Number(block.timestamp);
        }),
      );

      return attachTimestamps(entries, timestampsByBlock);
    },
  });
}
