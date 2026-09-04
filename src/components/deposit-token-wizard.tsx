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
import { formatUnits } from "viem";
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
import { Modal } from "@/components/ui/modal";
import { Stepper } from "@/components/ui/stepper";
import { TxStatus } from "@/components/tx-status";
import { QuotePreview } from "@/components/quote-preview";
import { kipuBankAbi } from "@/lib/abis/kipubank";
import { erc20Abi } from "@/lib/abis/erc20";
import {
  getKipuBankAddress,
  SEPOLIA_USDC,
  USDC_DECIMALS,
} from "@/lib/constants";
import { useBankStats, useIsSepolia } from "@/hooks/use-kipubank";
import { useSwapQuote } from "@/hooks/use-swap-quote";
import {
  calculateRemainingCapacity,
  mapBankStats,
} from "@/lib/bank-stats";
import { useDebouncedValue } from "@/hooks/use-debounce";
import {
  buildTokenSwapPath,
  isUsdcToken,
  needsTokenApproval,
} from "@/lib/token-deposit";
import { describeQuote } from "@/lib/quote";
import {
  canAdvanceFrom,
  canSubmitApprove,
  canSubmitDeposit,
  getApprovePreviewCopy,
  getDepositPreviewCopy,
  getNextStep,
  getPreviousStep,
  getStepperLabels,
  type DepositWizardStep,
} from "@/lib/deposit-stepper";
import { decodeKipuBankError } from "@/lib/errors";
import { sanitizeTokenSymbol } from "@/lib/sanitize";
import { formatUsd } from "@/lib/utils";
import { ZERO } from "@/lib/bigint";
import {
  parseAndValidateAmount,
  validateTokenAddress,
} from "@/lib/validation/schemas";

type TxKind = "idle" | "approve" | "deposit";

export function DepositTokenWizard() {
  const contractAddress = getKipuBankAddress();
  const { address: userAddress, isConnected } = useAccount();
  const isSepolia = useIsSepolia();
  const queryClient = useQueryClient();
  const bankStats = useBankStats();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<DepositWizardStep>("token");
  const [tokenAddressInput, setTokenAddressInput] = useState(SEPOLIA_USDC);
  const [amountInput, setAmountInput] = useState("");
  const [txKind, setTxKind] = useState<TxKind>("idle");

  const debouncedAmount = useDebouncedValue(amountInput);

  const {
    usdc: usdcFromContract,
    router: routerAddress,
    slippageBps,
    bankCap,
    totalDeposits,
  } = mapBankStats(bankStats.data);

  const remainingCapacity = calculateRemainingCapacity(bankCap, totalDeposits);

  const tokenValidation = useMemo(
    () => validateTokenAddress(tokenAddressInput),
    [tokenAddressInput],
  );

  const tokenAddress = tokenValidation.ok ? tokenValidation.value : undefined;
  const tokenAddressError = tokenValidation.ok ? undefined : tokenValidation.error;

  const isUsdc = isUsdcToken(tokenAddressInput, usdcFromContract);

  const { data: tokenMeta } = useReadContracts({
    contracts: tokenAddress
      ? [
          {
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "decimals",
          },
          {
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "symbol",
          },
        ]
      : [],
    query: { enabled: !!tokenAddress },
  });

  const decimals =
    (tokenMeta?.[0]?.result as number | undefined) ?? USDC_DECIMALS;
  const rawSymbol = tokenMeta?.[1]?.result as string | undefined;
  const symbol = sanitizeTokenSymbol(rawSymbol);

  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!tokenAddress && !!userAddress },
  });

  const amountValidation = useMemo(() => {
    if (!debouncedAmount) {
      return { ok: false as const, error: undefined };
    }
    return parseAndValidateAmount(
      debouncedAmount,
      decimals,
      tokenBalance,
      "Amount",
    );
  }, [debouncedAmount, decimals, tokenBalance]);

  const parsedAmount = amountValidation.ok ? amountValidation.value : undefined;
  const amountError = amountValidation.ok ? undefined : amountValidation.error;

  const swapPath = useMemo(() => {
    if (!tokenAddress || !usdcFromContract || isUsdc) return undefined;
    return buildTokenSwapPath(tokenAddress, usdcFromContract);
  }, [tokenAddress, usdcFromContract, isUsdc]);

  const symbolsByAddress = useMemo(
    () =>
      usdcFromContract
        ? {
            ...(tokenAddress
              ? { [tokenAddress.toLowerCase()]: symbol }
              : {}),
            [usdcFromContract.toLowerCase()]: "USDC",
          }
        : {},
    [tokenAddress, symbol, usdcFromContract],
  );

  const { quote: swapQuote, isQuoting } = useSwapQuote({
    routerAddress,
    amountIn: parsedAmount,
    path: swapPath,
    decimalsIn: decimals,
    symbolIn: symbol,
    slippageBps,
    symbolsByAddress,
    remainingCapacity,
    enabled: !!parsedAmount && !isUsdc && !!swapPath,
  });

  const directQuote = useMemo(() => {
    if (!parsedAmount || !isUsdc || slippageBps === undefined || !tokenAddress) {
      return undefined;
    }
    return describeQuote({
      amountIn: parsedAmount,
      decimalsIn: decimals,
      symbolIn: symbol,
      estimatedOut: parsedAmount,
      slippageBps,
      path: [tokenAddress],
      symbolsByAddress,
      remainingCapacity,
    });
  }, [
    decimals,
    parsedAmount,
    remainingCapacity,
    slippageBps,
    symbol,
    symbolsByAddress,
    tokenAddress,
    isUsdc,
  ]);

  const quote = isUsdc ? directQuote : swapQuote;
  const hasLiquidity = isUsdc || (quote !== undefined && !quote.noLiquidity);
  const wouldExceedCap = quote?.wouldExceedRemainingCap ?? false;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      userAddress && contractAddress
        ? [userAddress, contractAddress]
        : undefined,
    query: {
      enabled: !!userAddress && !!contractAddress && !!tokenAddress,
    },
  });

  const needsApproval = needsTokenApproval(parsedAmount, allowance);

  const stepperContext = useMemo(
    () => ({
      tokenAddress,
      tokenAddressError,
      parsedAmount,
      amountError,
      needsApproval,
      isUsdc,
      hasLiquidity,
      wouldExceedCap,
      approveSimReady: false,
      depositSimReady: false,
      isPendingTx: false,
    }),
    [
      amountError,
      hasLiquidity,
      isUsdc,
      needsApproval,
      parsedAmount,
      tokenAddress,
      tokenAddressError,
      wouldExceedCap,
    ],
  );

  const {
    data: approveSim,
    error: approveSimError,
  } = useSimulateContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "approve",
    args:
      contractAddress && parsedAmount
        ? [contractAddress, parsedAmount]
        : undefined,
    query: {
      enabled:
        step === "approve" &&
        !!needsApproval &&
        !!contractAddress &&
        !!parsedAmount &&
        isConnected &&
        isSepolia,
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
      parsedAmount && tokenAddress
        ? [tokenAddress, parsedAmount]
        : undefined,
    query: {
      enabled:
        step === "confirm" &&
        !!contractAddress &&
        !!parsedAmount &&
        parsedAmount > ZERO &&
        !needsApproval &&
        isConnected &&
        isSepolia &&
        !!tokenAddress,
    },
  });

  const enrichedContext = useMemo(
    () => ({
      ...stepperContext,
      approveSimReady: !!approveSim?.request,
      depositSimReady: !!depositSim?.request,
      isPendingTx: isPending || isConfirming,
    }),
    [approveSim?.request, depositSim?.request, isPending, isConfirming, stepperContext],
  );

  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: txSuccess } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  useEffect(() => {
    if (!txSuccess) return;
    void queryClient.invalidateQueries();
    resetWrite();

    if (txKind === "approve") {
      void refetchAllowance();
      setTxKind("idle");
      return;
    }

    if (txKind === "deposit") {
      setStep("success");
      setTxKind("idle");
    }
  }, [txSuccess, queryClient, resetWrite, txKind, refetchAllowance]);

  useEffect(() => {
    if (step === "approve" && !needsApproval) {
      setStep("confirm");
    }
  }, [step, needsApproval]);

  const simulationMessage =
    step === "approve" && approveSimError
      ? decodeKipuBankError(approveSimError)
      : step === "confirm" && depositSimError
        ? decodeKipuBankError(depositSimError)
        : null;

  const stepperSteps = getStepperLabels(needsApproval);
  const amountLabel =
    parsedAmount !== undefined
      ? formatUnits(parsedAmount, decimals)
      : amountInput;

  function resetWizard() {
    setStep("token");
    setTokenAddressInput(SEPOLIA_USDC);
    setAmountInput("");
    setTxKind("idle");
    resetWrite();
  }

  function closeWizard() {
    setWizardOpen(false);
    resetWizard();
  }

  function handleNext() {
    const next = getNextStep(step, needsApproval);
    if (next && canAdvanceFrom(step, enrichedContext)) {
      setStep(next);
    }
  }

  function handleBack() {
    const prev = getPreviousStep(step, needsApproval);
    if (prev) setStep(prev);
  }

  function handleApprove() {
    if (!approveSim?.request) return;
    setTxKind("approve");
    writeContract(approveSim.request);
  }

  function handleDeposit() {
    if (!depositSim?.request) return;
    setTxKind("deposit");
    writeContract(depositSim.request);
  }

  if (!contractAddress) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-emerald-500" />
            <CardTitle>Deposit ERC-20</CardTitle>
          </div>
          <CardDescription>
            Guided step-by-step deposit. USDC is credited directly; other tokens
            are swapped to USDC first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <Alert>
              <AlertDescription>Connect MetaMask to deposit.</AlertDescription>
            </Alert>
          ) : (
            <Button className="w-full" onClick={() => setWizardOpen(true)}>
              Start ERC-20 deposit
            </Button>
          )}
        </CardContent>
      </Card>

      <Modal
        open={wizardOpen}
        title="Deposit ERC-20"
        size="lg"
        onClose={closeWizard}
      >
        <div className="space-y-6">
          <Stepper steps={stepperSteps} currentStepId={step} />

          {step === "token" && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Enter the contract address of the token you want to deposit.
                Paste the token contract address — not your wallet address.
              </p>
              <div className="space-y-2">
                <label
                  htmlFor="wizard-token-address"
                  className="text-sm text-zinc-400"
                >
                  Token address
                </label>
                <Input
                  id="wizard-token-address"
                  placeholder={SEPOLIA_USDC}
                  value={tokenAddressInput}
                  onChange={(e) => setTokenAddressInput(e.target.value)}
                />
                {tokenAddressError && (
                  <p className="text-xs text-red-400">{tokenAddressError}</p>
                )}
              </div>
              {tokenAddress && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-300">
                  <p>
                    Token: <span className="font-medium">{symbol}</span> ·{" "}
                    {decimals} decimals
                  </p>
                  {tokenBalance !== undefined && (
                    <p className="mt-1 text-zinc-500">
                      Your balance: {formatUnits(tokenBalance, decimals)}{" "}
                      {symbol}
                    </p>
                  )}
                </div>
              )}
              <Alert variant="warning">
                <AlertDescription>
                  Only deposit tokens with Uniswap V2 liquidity on Sepolia. Fake
                  or unknown tokens can fail or credit less USDC than expected.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === "amount" && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Choose how much {symbol} to deposit. We will show an estimated
                USDC credit before you sign anything in MetaMask.
              </p>
              <div className="space-y-2">
                <label
                  htmlFor="wizard-token-amount"
                  className="text-sm text-zinc-400"
                >
                  Amount ({symbol})
                </label>
                <Input
                  id="wizard-token-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="100"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
                {amountError && (
                  <p className="text-xs text-red-400">{amountError}</p>
                )}
                {tokenBalance !== undefined && (
                  <p className="text-xs text-zinc-500">
                    Available in wallet: {formatUnits(tokenBalance, decimals)}{" "}
                    {symbol}
                  </p>
                )}
              </div>
              {parsedAmount && parsedAmount > ZERO && (
                <QuotePreview
                  quote={quote}
                  isLoading={!isUsdc && isQuoting}
                  title={isUsdc ? "Direct USDC deposit" : "Swap preview"}
                />
              )}
              {isUsdc && parsedAmount && parsedAmount > ZERO && (
                <p className="text-sm text-zinc-400">
                  Direct USDC deposit — no swap required. Your vault balance
                  increases by the same USDC amount.
                </p>
              )}
            </div>
          )}

          {step === "approve" && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                {getApprovePreviewCopy(symbol, amountLabel)}
              </p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-300">
                <p>
                  Spender: KipuBank ({contractAddress.slice(0, 10)}…)
                </p>
                <p className="mt-1">
                  Allowance requested: {amountLabel} {symbol}
                </p>
              </div>
              {simulationMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{simulationMessage}</AlertDescription>
                </Alert>
              )}
              <Button
                className="w-full"
                disabled={!canSubmitApprove(enrichedContext) || isPending || isConfirming}
                onClick={handleApprove}
              >
                {isPending || isConfirming ? "Approving…" : `Approve ${symbol}`}
              </Button>
              <TxStatus
                hash={txHash}
                isPending={isPending}
                isConfirming={isConfirming}
                isSuccess={txSuccess && txKind === "approve"}
                error={writeError ? decodeKipuBankError(writeError) : null}
              />
              {!needsApproval && (
                <p className="text-sm text-emerald-400">
                  Approval complete. Continue to confirm your deposit.
                </p>
              )}
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                {getDepositPreviewCopy(isUsdc, symbol)}
              </p>
              {quote && <QuotePreview quote={quote} title="Final summary" />}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-300">
                <p>
                  Deposit: {amountLabel} {symbol}
                </p>
                {quote && (
                  <p className="mt-1">
                    Minimum USDC credited: {quote.minOutLabel}
                  </p>
                )}
                {remainingCapacity !== undefined && (
                  <p className="mt-1 text-zinc-500">
                    Bank capacity remaining: ${formatUsd(remainingCapacity)}
                  </p>
                )}
              </div>
              {simulationMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{simulationMessage}</AlertDescription>
                </Alert>
              )}
              <Button
                className="w-full"
                disabled={
                  !canSubmitDeposit(enrichedContext) ||
                  isPending ||
                  isConfirming ||
                  isSimulatingDeposit
                }
                onClick={handleDeposit}
              >
                {isPending || isConfirming
                  ? "Depositing…"
                  : isSimulatingDeposit
                    ? "Validating…"
                    : `Deposit ${symbol}`}
              </Button>
              <TxStatus
                hash={txHash}
                isPending={isPending}
                isConfirming={isConfirming}
                isSuccess={txSuccess && txKind === "deposit"}
                error={writeError ? decodeKipuBankError(writeError) : null}
              />
            </div>
          )}

          {step === "success" && (
            <div className="space-y-4">
              <Alert variant="success">
                <AlertDescription>
                  Deposit confirmed. Your USDC vault balance will update after
                  the transaction is indexed.
                </AlertDescription>
              </Alert>
              <TxStatus
                hash={txHash}
                isSuccess={txSuccess}
              />
              <Button className="w-full" variant="secondary" onClick={closeWizard}>
                Close
              </Button>
            </div>
          )}

          {step !== "success" && step !== "confirm" && step !== "approve" && (
            <div className="flex justify-between gap-3 border-t border-zinc-800 pt-4">
              <Button
                variant="outline"
                disabled={!getPreviousStep(step, needsApproval)}
                onClick={handleBack}
              >
                Back
              </Button>
              <Button
                disabled={!canAdvanceFrom(step, enrichedContext)}
                onClick={handleNext}
              >
                Continue
              </Button>
            </div>
          )}

          {(step === "approve" || step === "confirm") &&
            getPreviousStep(step, needsApproval) && (
              <div className="border-t border-zinc-800 pt-4">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              </div>
            )}

          {step === "approve" && !needsApproval && (
            <div className="border-t border-zinc-800 pt-4">
              <Button className="w-full" onClick={() => setStep("confirm")}>
                Continue to confirm
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
