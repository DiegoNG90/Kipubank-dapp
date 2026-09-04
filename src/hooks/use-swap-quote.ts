"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { uniswapV2RouterAbi } from "@/lib/abis/router";
import { calculateMinOut } from "@/lib/swap";
import { describeQuote, type QuoteViewModel } from "@/lib/quote";

type UseSwapQuoteParams = {
  routerAddress?: `0x${string}`;
  amountIn?: bigint;
  path?: readonly `0x${string}`[];
  decimalsIn: number;
  symbolIn: string;
  slippageBps?: bigint;
  symbolsByAddress?: Record<string, string>;
  treatFirstAsEth?: boolean;
  remainingCapacity?: bigint;
  enabled?: boolean;
};

type UseSwapQuoteResult = {
  quote?: QuoteViewModel;
  estimatedOut?: bigint;
  minOut?: bigint;
  isQuoting: boolean;
};

export function useSwapQuote({
  routerAddress,
  amountIn,
  path,
  decimalsIn,
  symbolIn,
  slippageBps,
  symbolsByAddress = {},
  treatFirstAsEth = false,
  remainingCapacity,
  enabled = true,
}: UseSwapQuoteParams): UseSwapQuoteResult {
  const shouldQuote =
    enabled &&
    !!routerAddress &&
    !!amountIn &&
    amountIn > 0n &&
    !!path &&
    path.length > 0 &&
    slippageBps !== undefined;

  const { data: quoteData, isFetching } = useReadContract({
    address: routerAddress,
    abi: uniswapV2RouterAbi,
    functionName: "getAmountsOut",
    args: shouldQuote ? [amountIn, [...path]] : undefined,
    query: { enabled: shouldQuote },
  });

  const estimatedOut =
    quoteData && quoteData.length > 0
      ? quoteData[quoteData.length - 1]
      : undefined;

  const minOut =
    estimatedOut !== undefined && slippageBps !== undefined
      ? calculateMinOut(estimatedOut, slippageBps)
      : undefined;

  const quote = useMemo(() => {
    if (!shouldQuote || !path || slippageBps === undefined || !amountIn) {
      return undefined;
    }
    return describeQuote({
      amountIn,
      decimalsIn,
      symbolIn,
      estimatedOut,
      slippageBps,
      path,
      symbolsByAddress,
      treatFirstAsEth,
      remainingCapacity,
    });
  }, [
    amountIn,
    decimalsIn,
    estimatedOut,
    path,
    remainingCapacity,
    shouldQuote,
    slippageBps,
    symbolIn,
    symbolsByAddress,
    treatFirstAsEth,
  ]);

  return {
    quote,
    estimatedOut,
    minOut,
    isQuoting: isFetching,
  };
}
