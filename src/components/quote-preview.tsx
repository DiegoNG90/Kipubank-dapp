"use client";

import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { QuoteViewModel } from "@/lib/quote";

type QuotePreviewProps = {
  quote?: QuoteViewModel;
  isLoading?: boolean;
  title?: string;
};

export function QuotePreview({
  quote,
  isLoading = false,
  title = "Swap preview",
}: QuotePreviewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Fetching quote…
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{title}</p>

      <dl className="space-y-2">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">You deposit</dt>
          <dd className="font-medium text-zinc-200">{quote.amountInLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Swap path</dt>
          <dd className="text-right font-mono text-xs text-zinc-300">
            {quote.pathLabel}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Est. USDC credited</dt>
          <dd className="font-medium text-emerald-400">
            {quote.estimatedOutLabel}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Slippage tolerance</dt>
          <dd className="text-zinc-300">{quote.slippageLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Minimum you receive</dt>
          <dd className="font-medium text-zinc-200">{quote.minOutLabel}</dd>
        </div>
      </dl>

      {quote.warnings.map((warning) => (
        <Alert key={warning} variant="warning">
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ))}

      {quote.noLiquidity && (
        <p className="text-amber-400/90">
          Unable to quote — check liquidity on Sepolia.
        </p>
      )}
    </div>
  );
}
