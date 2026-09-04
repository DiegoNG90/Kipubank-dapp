"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAccount } from "wagmi";
import {
  useBankStats,
  useUserUsdcBalance,
  useIsConfigured,
} from "@/hooks/use-kipubank";
import { isExpectedKipuBankAddress } from "@/lib/constants";
import {
  calculateCapacityPct,
  calculateRemainingCapacity,
  isCapacityNearFull,
  mapBankStats,
} from "@/lib/bank-stats";
import { formatUsd } from "@/lib/utils";
import { ZERO } from "@/lib/bigint";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, Loader2 } from "lucide-react";

export function BankPanel() {
  const isConfigured = useIsConfigured();
  const { isConnected } = useAccount();
  const bankStats = useBankStats();
  const userBalance = useUserUsdcBalance();

  if (!isConfigured) {
    return (
      <Alert variant="warning">
        <AlertTitle>Contract not configured</AlertTitle>
        <AlertDescription>
          Set <code className="text-amber-200">NEXT_PUBLIC_KIPUBANK_ADDRESS</code>{" "}
          in your <code className="text-amber-200">.env.local</code> file.
        </AlertDescription>
      </Alert>
    );
  }

  if (bankStats.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </CardContent>
      </Card>
    );
  }

  const {
    bankCap,
    totalDeposits,
    depositOps,
    withdrawOps,
    maxWithdrawal,
    slippageBps,
  } = mapBankStats(bankStats.data);

  const capacityPct = calculateCapacityPct(bankCap, totalDeposits);
  const remainingCapacity = calculateRemainingCapacity(bankCap, totalDeposits);
  const nearFull = isCapacityNearFull(capacityPct);

  const userUsdc = userBalance.data?.[0]?.result as bigint | undefined;
  const unexpectedContract = !isExpectedKipuBankAddress();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-emerald-500" />
          <CardTitle>Bank Overview</CardTitle>
        </div>
        <CardDescription>
          On-chain vault stats from KipuBankV3 on Sepolia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {unexpectedContract && (
          <Alert variant="warning">
            <AlertTitle>Unexpected contract address</AlertTitle>
            <AlertDescription>
              This UI is configured for a KipuBank address that is not the
              known Sepolia deployment. Confirm{" "}
              <code className="text-amber-200">NEXT_PUBLIC_KIPUBANK_ADDRESS</code>{" "}
              before sending a transaction.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total Value Locked" value={`$${formatUsd(totalDeposits ?? ZERO)}`} />
          <Stat label="Bank Cap" value={`$${formatUsd(bankCap ?? ZERO)}`} />
          <Stat
            label="Available capacity"
            value={`$${formatUsd(remainingCapacity)}`}
            hint={nearFull ? "Near full — large deposits may revert" : undefined}
            warn={nearFull}
          />
          <Stat label="Deposits" value={depositOps?.toString() ?? "—"} />
          <Stat label="Withdrawals" value={withdrawOps?.toString() ?? "—"} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Capacity used</span>
            <span
              className={`font-medium ${nearFull ? "text-amber-300" : "text-zinc-200"}`}
            >
              {capacityPct.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={capacityPct}
            className={nearFull ? "[&>div]:from-amber-600 [&>div]:to-amber-400" : undefined}
          />
          <p className="text-xs text-zinc-500">
            Up to ${formatUsd(remainingCapacity)} more can be deposited before
            the bank reaches its cap.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stat
            label="Max withdrawal / tx"
            value={`$${formatUsd(maxWithdrawal ?? ZERO)}`}
            small
          />
          <Stat
            label="Slippage tolerance"
            value={
              slippageBps !== undefined
                ? `${(Number(slippageBps) / 100).toFixed(2)}%`
                : "—"
            }
            small
          />
        </div>

        {isConnected && (
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-4">
            <p className="text-xs uppercase tracking-wider text-emerald-500/80">
              Your USDC balance
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-100">
              ${formatUsd(userUsdc ?? ZERO)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  small,
  hint,
  warn,
}: {
  label: string;
  value: string;
  small?: boolean;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-zinc-950/40 p-4 ${
        warn ? "border-amber-900/50" : "border-zinc-800"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-semibold ${small ? "text-base" : "text-xl"} ${
          warn ? "text-amber-200" : "text-zinc-100"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-amber-400/90">{hint}</p>
      )}
    </div>
  );
}
