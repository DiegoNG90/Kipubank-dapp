"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ETHERSCAN_TX_URL } from "@/lib/constants";

interface TxStatusProps {
  hash?: `0x${string}`;
  isPending?: boolean;
  isConfirming?: boolean;
  isSuccess?: boolean;
  error?: string | null;
}

export function TxStatus({
  hash,
  isPending,
  isConfirming,
  isSuccess,
  error,
}: TxStatusProps) {
  if (!hash && !isPending && !error) return null;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Transaction failed</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isPending || isConfirming) {
    return (
      <Alert variant="default">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>
          {isPending ? "Awaiting wallet confirmation…" : "Confirming on-chain…"}
        </AlertTitle>
        {hash && (
          <AlertDescription>
            <a
              href={`${ETHERSCAN_TX_URL}/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
            >
              View on Etherscan <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        )}
      </Alert>
    );
  }

  if (isSuccess && hash) {
    return (
      <Alert variant="success">
        <AlertTitle>Transaction confirmed</AlertTitle>
        <AlertDescription>
          <a
            href={`${ETHERSCAN_TX_URL}/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-300 hover:underline"
          >
            View on Etherscan <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
