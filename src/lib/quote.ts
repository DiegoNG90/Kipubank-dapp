import { formatUnits } from "viem";
import { calculateMinOut } from "@/lib/swap";
import { sanitizeTokenSymbol } from "@/lib/sanitize";
import { SEPOLIA_WETH } from "@/lib/constants";
import { formatUsd } from "@/lib/utils";

export type QuoteInput = {
  amountIn: bigint;
  decimalsIn: number;
  symbolIn: string;
  estimatedOut?: bigint;
  slippageBps: bigint;
  path: readonly `0x${string}`[];
  symbolsByAddress: Record<string, string>;
  treatFirstAsEth?: boolean;
  remainingCapacity?: bigint;
  outDecimals?: number;
};

export type QuoteViewModel = {
  pathLabel: string;
  amountInLabel: string;
  estimatedOutLabel: string;
  minOutLabel: string;
  slippageLabel: string;
  noLiquidity: boolean;
  wouldExceedRemainingCap: boolean;
  warnings: string[];
};

function labelForAddress(
  address: `0x${string}`,
  symbolsByAddress: Record<string, string>,
): string {
  if (address.toLowerCase() === SEPOLIA_WETH.toLowerCase()) return "WETH";
  const symbol = symbolsByAddress[address.toLowerCase()];
  return sanitizeTokenSymbol(symbol);
}

export function buildHumanPath(
  path: readonly `0x${string}`[],
  symbolsByAddress: Record<string, string>,
  options?: { treatFirstAsEth?: boolean },
): string {
  if (path.length === 0) return "—";
  const treatFirstAsEth = options?.treatFirstAsEth ?? false;

  if (
    treatFirstAsEth &&
    path[0]?.toLowerCase() === SEPOLIA_WETH.toLowerCase()
  ) {
    const tail = path
      .slice(1)
      .map((addr) => labelForAddress(addr, symbolsByAddress));
    return ["ETH", "WETH", ...tail].join(" → ");
  }

  return path
    .map((addr) => labelForAddress(addr, symbolsByAddress))
    .join(" → ");
}

export function describeQuote(input: QuoteInput): QuoteViewModel {
  const {
    amountIn,
    decimalsIn,
    symbolIn,
    estimatedOut,
    slippageBps,
    path,
    symbolsByAddress,
    treatFirstAsEth = false,
    remainingCapacity,
    outDecimals = 6,
  } = input;

  const warnings: string[] = [];
  const noLiquidity = estimatedOut === undefined;
  const minOut =
    estimatedOut !== undefined
      ? calculateMinOut(estimatedOut, slippageBps)
      : undefined;

  const wouldExceedRemainingCap =
    remainingCapacity !== undefined &&
    estimatedOut !== undefined &&
    estimatedOut > remainingCapacity;

  if (wouldExceedRemainingCap) {
    warnings.push(
      "This deposit would exceed the bank's remaining capacity and may revert.",
    );
  }

  if (noLiquidity) {
    warnings.push("No swap path or liquidity found for this amount.");
  }

  const slippagePct = (Number(slippageBps) / 100).toFixed(2);

  return {
    pathLabel: buildHumanPath(path, symbolsByAddress, { treatFirstAsEth }),
    amountInLabel: `${formatUnits(amountIn, decimalsIn)} ${sanitizeTokenSymbol(symbolIn)}`,
    estimatedOutLabel:
      estimatedOut !== undefined ? `$${formatUsd(estimatedOut, outDecimals)}` : "—",
    minOutLabel:
      minOut !== undefined ? `$${formatUsd(minOut, outDecimals)}` : "—",
    slippageLabel: `${slippagePct}%`,
    noLiquidity,
    wouldExceedRemainingCap,
    warnings,
  };
}
