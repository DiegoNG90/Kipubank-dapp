"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, isAddress } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { Coins } from "lucide-react";
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
import { erc20Abi } from "@/lib/abis/erc20";
import { uniswapV2RouterAbi } from "@/lib/abis/router";
import {
  getKipuBankAddress,
  SEPOLIA_USDC,
  USDC_DECIMALS,
  SEPOLIA_WETH,
} from "@/lib/constants";
import { useBankStats } from "@/hooks/use-kipubank";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { calculateMinOut } from "@/lib/swap";
import { decodeKipuBankError } from "@/lib/errors";
import { formatUsd } from "@/lib/utils";
import { ZERO } from "@/lib/bigint";

type TxStep = "idle" | "approve" | "deposit";

export function DepositToken() {
  const contractAddress = getKipuBankAddress();
  const { address: userAddress, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const bankStats = useBankStats();

  const [tokenAddress, setTokenAddress] = useState<string>(SEPOLIA_USDC);
  const [amount, setAmount] = useState("");
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const debouncedAmount = useDebouncedValue(amount);

  const usdcFromContract = bankStats.data?.[6]?.result as `0x${string}` | undefined;
  const routerAddress = bankStats.data?.[7]?.result as `0x${string}` | undefined;
  const slippageBps = bankStats.data?.[5]?.result as bigint | undefined;

  const isUsdc =
    tokenAddress.toLowerCase() === SEPOLIA_USDC.toLowerCase() ||
    (usdcFromContract &&
      tokenAddress.toLowerCase() === usdcFromContract.toLowerCase());

  const tokenValid = isAddress(tokenAddress);

  const { data: tokenMeta } = useReadContracts({
    contracts: tokenValid
      ? [
          {
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "decimals",
          },
          {
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "symbol",
          },
        ]
      : [],
    query: { enabled: tokenValid },
  });

  const decimals = (tokenMeta?.[0]?.result as number | undefined) ?? USDC_DECIMALS;
  const symbol = (tokenMeta?.[1]?.result as string | undefined) ?? "TOKEN";

  const parsedAmount = useMemo(() => {
    try {
      if (!debouncedAmount || Number(debouncedAmount) <= 0) return undefined;
      return parseUnits(debouncedAmount, decimals);
    } catch {
      return undefined;
    }
  }, [debouncedAmount, decimals]);

  const swapPath = useMemo(() => {
    if (!routerAddress || !usdcFromContract || isUsdc) return undefined;
    return [tokenAddress as `0x${string}`, SEPOLIA_WETH, usdcFromContract] as const;
  }, [routerAddress, usdcFromContract, isUsdc, tokenAddress]);

  const { data: quoteData, isFetching: isQuoting } = useReadContract({
    address: routerAddress,
    abi: uniswapV2RouterAbi,
    functionName: "getAmountsOut",
    args:
      parsedAmount && swapPath && !isUsdc
        ? [parsedAmount, [...swapPath]]
        : undefined,
    query: {
      enabled: !!parsedAmount && !!swapPath && !isUsdc,
    },
  });

  const estimatedUsdc = isUsdc
    ? parsedAmount
    : quoteData && quoteData.length > 0
      ? quoteData[quoteData.length - 1]
      : undefined;

  const minUsdc =
    estimatedUsdc !== undefined && slippageBps !== undefined && !isUsdc
      ? calculateMinOut(estimatedUsdc, slippageBps)
      : undefined;

  const { data: allowance } = useReadContract({
    address: tokenValid ? (tokenAddress as `0x${string}`) : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      userAddress && contractAddress
        ? [userAddress, contractAddress]
        : undefined,
    query: {
      enabled: !!userAddress && !!contractAddress && tokenValid,
    },
  });

  const needsApproval =
    parsedAmount !== undefined &&
    parsedAmount > ZERO &&
    (allowance === undefined || allowance < parsedAmount);

  const {
    data: approveSim,
    error: approveSimError,
  } = useSimulateContract({
    address: tokenValid ? (tokenAddress as `0x${string}`) : undefined,
    abi: erc20Abi,
    functionName: "approve",
    args:
      contractAddress && parsedAmount
        ? [contractAddress, parsedAmount]
        : undefined,
    query: {
      enabled:
        !!needsApproval &&
        !!contractAddress &&
        !!parsedAmount &&
        isConnected,
    },
  });

  const {
    data: depositSim,
    error: depositSimError,
    isFetching: isSimulatingDeposit,
  } = useSimulateContract({
    address: contractAddress,
    abi: kipuBankAbi,
    functionName: "depositToken",
    args:
      parsedAmount && tokenValid
        ? [tokenAddress as `0x${string}`, parsedAmount]
        : undefined,
    query: {
      enabled:
        !!contractAddress &&
        !!parsedAmount &&
        parsedAmount > ZERO &&
        !needsApproval &&
        isConnected &&
        tokenValid,
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

  const simulationMessage = needsApproval
    ? approveSimError
      ? decodeKipuBankError(approveSimError)
      : null
    : depositSimError
      ? decodeKipuBankError(depositSimError)
      : null;

  function handleAction() {
    if (needsApproval && approveSim?.request) {
      setTxStep("approve");
      writeContract(approveSim.request, {
        onSuccess: () => setTxStep("idle"),
      });
      return;
    }
    if (depositSim?.request) {
      setTxStep("deposit");
      writeContract(depositSim.request, {
        onSuccess: () => {
          setAmount("");
          setTxStep("idle");
        },
      });
    }
  }

  if (!contractAddress) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-emerald-500" />
          <CardTitle>Deposit ERC-20</CardTitle>
        </div>
        <CardDescription>
          USDC is credited directly; other tokens are swapped to USDC first.
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
              <label htmlFor="token-address" className="text-sm text-zinc-400">
                Token address
              </label>
              <Input
                id="token-address"
                placeholder={SEPOLIA_USDC}
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
              />
              {!tokenValid && tokenAddress.length > 0 && (
                <p className="text-xs text-red-400">Invalid address</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="token-amount" className="text-sm text-zinc-400">
                Amount ({symbol})
              </label>
              <Input
                id="token-amount"
                type="number"
                min="0"
                step="any"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {parsedAmount && parsedAmount > ZERO && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm">
                {isUsdc ? (
                  <p className="text-zinc-300">
                    Direct USDC deposit — no swap required.
                  </p>
                ) : isQuoting ? (
                  <p className="text-zinc-400">Fetching swap quote…</p>
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
                        Min after slippage: ${formatUsd(minUsdc)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-amber-400/90">
                    No swap path found for this token.
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
              disabled={
                !tokenValid ||
                !parsedAmount ||
                parsedAmount <= ZERO ||
                isPending ||
                isConfirming ||
                isSimulatingDeposit ||
                (!needsApproval && !depositSim?.request) ||
                (needsApproval && !approveSim?.request)
              }
              onClick={handleAction}
            >
              {isPending || isConfirming
                ? txStep === "approve"
                  ? "Approving…"
                  : "Depositing…"
                : needsApproval
                  ? `Approve ${symbol}`
                  : `Deposit ${symbol}`}
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
