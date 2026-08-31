"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TxStatus } from "@/components/tx-status";
import { kipuBankAbi } from "@/lib/abis/kipubank";
import { uniswapV2RouterAbi } from "@/lib/abis/router";
import {
  getKipuBankAddress,
  ETH_DECIMALS,
  USDC_DECIMALS,
  SEPOLIA_WETH,
} from "@/lib/constants";
import { useBankStats } from "@/hooks/use-kipubank";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { calculateMinOut } from "@/lib/swap";
import { decodeKipuBankError } from "@/lib/errors";
import { formatUsd } from "@/lib/utils";
import { ZERO } from "@/lib/bigint";

export function DepositEth() {
  const contractAddress = getKipuBankAddress();
  const { isConnected } = useAccount();
  const queryClient = useQueryClient();
  const bankStats = useBankStats();

  const [amount, setAmount] = useState("");
  const debouncedAmount = useDebouncedValue(amount);

  const routerAddress = bankStats.data?.[7]?.result as `0x${string}` | undefined;
  const slippageBps = bankStats.data?.[5]?.result as bigint | undefined;

  const usdcAddress = bankStats.data?.[6]?.result as `0x${string}` | undefined;

  const parsedValue = useMemo(() => {
    try {
      if (!debouncedAmount || Number(debouncedAmount) <= 0) return undefined;
      return parseUnits(debouncedAmount, ETH_DECIMALS);
    } catch {
      return undefined;
    }
  }, [debouncedAmount]);

  const swapPath = useMemo(
    () => (usdcAddress ? ([SEPOLIA_WETH, usdcAddress] as const) : undefined),
    [usdcAddress],
  );

  const { data: quoteData, isFetching: isQuoting } = useReadContract({
    address: routerAddress,
    abi: uniswapV2RouterAbi,
    functionName: "getAmountsOut",
    args: parsedValue && swapPath ? [parsedValue, [...swapPath]] : undefined,
    query: {
      enabled: !!parsedValue && !!routerAddress && !!swapPath,
    },
  });

  const estimatedUsdc =
    quoteData && quoteData.length > 0
      ? quoteData[quoteData.length - 1]
      : undefined;

  const minUsdc =
    estimatedUsdc !== undefined && slippageBps !== undefined
      ? calculateMinOut(estimatedUsdc, slippageBps)
      : undefined;

  const {
    data: simulateData,
    error: simulateError,
    isFetching: isSimulating,
  } = useSimulateContract({
    address: contractAddress,
    abi: kipuBankAbi,
    functionName: "depositEther",
    value: parsedValue,
    query: {
      enabled:
        !!contractAddress &&
        !!parsedValue &&
        parsedValue > ZERO &&
        isConnected,
    },
  });

  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isSuccess) {
      void queryClient.invalidateQueries();
      resetWrite();
    }
  }, [isSuccess, queryClient, resetWrite]);

  const simulationMessage = simulateError
    ? decodeKipuBankError(simulateError)
    : null;

  const canDeposit =
    !!simulateData?.request &&
    !simulationMessage &&
    !isPending &&
    !isConfirming;

  function handleDeposit() {
    if (!simulateData?.request) return;
    writeContract(simulateData.request, {
      onSuccess: () => setAmount(""),
    });
  }

  if (!contractAddress) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="h-5 w-5 text-emerald-500" />
          <CardTitle>Deposit ETH</CardTitle>
        </div>
        <CardDescription>
          ETH is swapped to USDC via Uniswap V2 and credited to your balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <Alert>
            <AlertDescription>Connect MetaMask to deposit.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="eth-amount" className="text-sm text-zinc-400">
                Amount (ETH)
              </label>
              <Input
                id="eth-amount"
                type="number"
                min="0"
                step="any"
                placeholder="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {parsedValue && parsedValue > ZERO && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm">
                {isQuoting ? (
                  <p className="text-zinc-400">Fetching quote…</p>
                ) : estimatedUsdc !== undefined ? (
                  <div className="space-y-1">
                    <p className="text-zinc-300">
                      Est. USDC:{" "}
                      <span className="font-medium text-emerald-400">
                        ${formatUsd(estimatedUsdc)}
                      </span>
                    </p>
                    {minUsdc !== undefined && slippageBps !== undefined && (
                      <p className="text-zinc-500">
                        Min after {Number(slippageBps) / 100}% slippage: $
                        {formatUsd(minUsdc)} ({formatUnits(minUsdc, USDC_DECIMALS)} USDC)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-amber-400/90">
                    Unable to quote — check liquidity on Sepolia.
                  </p>
                )}
              </div>
            )}

            {simulationMessage && (
              <Alert variant="destructive">
                <AlertDescription>{simulationMessage}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              disabled={!canDeposit || isSimulating}
              onClick={handleDeposit}
            >
              {isPending || isConfirming
                ? "Processing…"
                : isSimulating
                  ? "Validating…"
                  : "Deposit ETH"}
            </Button>

            <TxStatus
              hash={txHash}
              isPending={isPending}
              isConfirming={isConfirming}
              isSuccess={isSuccess}
              error={
                writeError ? decodeKipuBankError(writeError) : null
              }
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
