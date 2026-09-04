"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
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
import { QuotePreview } from "@/components/quote-preview";
import { kipuBankAbi } from "@/lib/abis/kipubank";
import {
  getKipuBankAddress,
  ETH_DECIMALS,
} from "@/lib/constants";
import { useBankStats, useIsSepolia } from "@/hooks/use-kipubank";
import { useSwapQuote } from "@/hooks/use-swap-quote";
import {
  calculateRemainingCapacity,
  mapBankStats,
} from "@/lib/bank-stats";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { parseAmountInput, isPositiveAmount } from "@/lib/amounts";
import { buildEthSwapPath } from "@/lib/token-deposit";
import { decodeKipuBankError } from "@/lib/errors";
import { ZERO } from "@/lib/bigint";

export function DepositEth() {
  const contractAddress = getKipuBankAddress();
  const { isConnected } = useAccount();
  const isSepolia = useIsSepolia();
  const queryClient = useQueryClient();
  const bankStats = useBankStats();

  const [amount, setAmount] = useState("");
  const debouncedAmount = useDebouncedValue(amount);

  const { router: routerAddress, slippageBps, usdc: usdcAddress, bankCap, totalDeposits } =
    mapBankStats(bankStats.data);

  const remainingCapacity = calculateRemainingCapacity(bankCap, totalDeposits);

  const parsedValue = useMemo(
    () => parseAmountInput(debouncedAmount, ETH_DECIMALS),
    [debouncedAmount],
  );

  const swapPath = useMemo(
    () => (usdcAddress ? buildEthSwapPath(usdcAddress) : undefined),
    [usdcAddress],
  );

  const symbolsByAddress = useMemo(
    () => (usdcAddress ? { [usdcAddress.toLowerCase()]: "USDC" } : {}),
    [usdcAddress],
  );

  const { quote, isQuoting } = useSwapQuote({
    routerAddress,
    amountIn: parsedValue,
    path: swapPath,
    decimalsIn: ETH_DECIMALS,
    symbolIn: "ETH",
    slippageBps,
    symbolsByAddress,
    treatFirstAsEth: true,
    remainingCapacity,
    enabled: isPositiveAmount(parsedValue) && !!routerAddress && !!swapPath,
  });

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
        isConnected &&
        isSepolia &&
        !quote?.wouldExceedRemainingCap,
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
    !isConfirming &&
    !quote?.wouldExceedRemainingCap;

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
              <QuotePreview quote={quote} isLoading={isQuoting} />
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
