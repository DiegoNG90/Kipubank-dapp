"use client";

import { ArrowDownToLine, ArrowUpFromLine, ExternalLink, History, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAccount } from "wagmi";
import { useBankStats } from "@/hooks/use-kipubank";
import { useTxHistory } from "@/hooks/use-tx-history";
import { mapBankStats } from "@/lib/bank-stats";
import {
  formatAbsoluteTime,
  formatHistoryCreditedUsdc,
  formatHistoryInputAmount,
  formatHistoryTypeLabel,
  formatRelativeTime,
  type HistoryEntry,
} from "@/lib/tx-history";
import { etherscanTxUrl } from "@/lib/sanitize";

function HistoryIcon({ type }: { type: HistoryEntry["type"] }) {
  if (type === "withdraw") {
    return <ArrowUpFromLine className="h-4 w-4 text-amber-400" />;
  }
  return <ArrowDownToLine className="h-4 w-4 text-emerald-400" />;
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const txUrl = etherscanTxUrl(entry.txHash);

  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-zinc-800">
            <HistoryIcon type={entry.type} />
          </div>
          <div>
            <p className="font-medium text-zinc-100">
              {formatHistoryTypeLabel(entry.type)}
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              {formatHistoryInputAmount(entry)}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              USDC credited:{" "}
              <span className="text-emerald-400">
                {formatHistoryCreditedUsdc(entry.creditedUsdc)}
              </span>
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <p title={formatAbsoluteTime(entry.timestamp)}>
            {formatRelativeTime(entry.timestamp)}
          </p>
          {txUrl && (
            <a
              href={txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-emerald-400 hover:underline"
            >
              Etherscan
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

export function TransactionHistory() {
  const { address, isConnected } = useAccount();
  const bankStats = useBankStats();
  const { usdc: usdcAddress } = mapBankStats(bankStats.data);
  const history = useTxHistory(address, usdcAddress);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-emerald-500" />
          <CardTitle>Your transaction history</CardTitle>
        </div>
        <CardDescription>
          On-chain deposits and withdrawals for your connected wallet on
          KipuBankV3.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected || !address ? (
          <Alert>
            <AlertDescription>
              Connect MetaMask to see your KipuBank activity.
            </AlertDescription>
          </Alert>
        ) : history.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            Loading on-chain history…
          </div>
        ) : history.isError ? (
          <Alert variant="warning">
            <AlertDescription>
              Could not load transaction history. Try again later or set{" "}
              <code className="text-amber-200">NEXT_PUBLIC_KIPUBANK_DEPLOY_BLOCK</code>{" "}
              if your RPC limits log ranges.
            </AlertDescription>
          </Alert>
        ) : !history.data?.length ? (
          <Alert>
            <AlertDescription>
              No KipuBank deposits or withdrawals found for this wallet in the
              scanned block range.
            </AlertDescription>
          </Alert>
        ) : (
          <ul className="space-y-3">
            {history.data.map((entry) => (
              <HistoryRow key={`${entry.txHash}-${entry.type}`} entry={entry} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
