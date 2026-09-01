"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpFromLine } from "lucide-react";
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
import {
  getKipuBankAddress,
  USDC_DECIMALS,
} from "@/lib/constants";
import { ZERO } from "@/lib/bigint";
import { useBankStats, useUserUsdcBalance } from "@/hooks/use-kipubank";
import { mapBankStats } from "@/lib/bank-stats";
import { parseAmountInput } from "@/lib/amounts";
import {
  formatMaxWithdrawInput,
  validateWithdrawAmount,
} from "@/lib/withdraw";
import { decodeKipuBankError } from "@/lib/errors";
import { formatUsd } from "@/lib/utils";

export function WithdrawUsdc() {
  const contractAddress = getKipuBankAddress();
  const { isConnected } = useAccount();
  const queryClient = useQueryClient();
  const bankStats = useBankStats();
  const userBalance = useUserUsdcBalance();

  const [amount, setAmount] = useState("");

  const { usdc: usdcAddress, maxWithdrawal } = mapBankStats(bankStats.data);
  const userUsdc = userBalance.data?.[0]?.result as bigint | undefined;

  const parsedAmount = useMemo(
    () => parseAmountInput(amount, USDC_DECIMALS),
    [amount],
  );

  const clientValidation = useMemo(
    () => validateWithdrawAmount(parsedAmount, userUsdc, maxWithdrawal),
    [parsedAmount, userUsdc, maxWithdrawal],
  );

  const {
    data: simulateData,
    error: simulateError,
    isFetching: isSimulating,
  } = useSimulateContract({
    address: contractAddress,
    abi: kipuBankAbi,
    functionName: "withdrawToken",
    args:
      usdcAddress && parsedAmount
        ? [usdcAddress, parsedAmount]
        : undefined,
    query: {
      enabled:
        !!contractAddress &&
        !!usdcAddress &&
        !!parsedAmount &&
        parsedAmount > ZERO &&
        !clientValidation &&
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
      resetWrite();
      void queryClient.invalidateQueries();
    }
  }, [isSuccess, queryClient, resetWrite]);

  const simulationMessage = simulateError
    ? decodeKipuBankError(simulateError)
    : null;

  function handleMax() {
    if (userUsdc === undefined) return;
    setAmount(formatMaxWithdrawInput(userUsdc, maxWithdrawal, USDC_DECIMALS));
  }

  function handleWithdraw() {
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
          <ArrowUpFromLine className="h-5 w-5 text-emerald-500" />
          <CardTitle>Withdraw USDC</CardTitle>
        </div>
        <CardDescription>
          Withdraw your credited USDC balance from the vault.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <Alert>
            <AlertDescription>Connect MetaMask to withdraw.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="withdraw-amount" className="text-sm text-zinc-400">
                  Amount (USDC)
                </label>
                <button
                  type="button"
                  onClick={handleMax}
                  className="text-xs text-emerald-500 hover:text-emerald-400"
                >
                  Max
                </button>
              </div>
              <Input
                id="withdraw-amount"
                type="number"
                min="0"
                step="any"
                placeholder="50.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {userUsdc !== undefined && (
                <p className="text-xs text-zinc-500">
                  Available: ${formatUsd(userUsdc)}
                  {maxWithdrawal !== undefined && (
                    <> · Max/tx: ${formatUsd(maxWithdrawal)}</>
                  )}
                </p>
              )}
            </div>

            {clientValidation && parsedAmount && parsedAmount > ZERO && (
              <Alert variant="warning">
                <AlertDescription>{clientValidation}</AlertDescription>
              </Alert>
            )}

            {simulationMessage && (
              <Alert variant="destructive">
                <AlertDescription>{simulationMessage}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              variant="secondary"
              disabled={
                !simulateData?.request ||
                !!clientValidation ||
                isPending ||
                isConfirming ||
                isSimulating
              }
              onClick={handleWithdraw}
            >
              {isPending || isConfirming
                ? "Processing…"
                : isSimulating
                  ? "Validating…"
                  : "Withdraw USDC"}
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
