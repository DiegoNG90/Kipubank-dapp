"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SEPOLIA_CHAIN_ID } from "@/lib/constants";
import { sepolia } from "viem/chains";

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) {
    return <>{children}</>;
  }

  if (chainId !== SEPOLIA_CHAIN_ID) {
    return (
      <div className="space-y-6">
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Wrong network</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              KipuBank Console requires Sepolia (chain ID {SEPOLIA_CHAIN_ID}).
              You are on chain {chainId ?? "unknown"}.
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => switchChain({ chainId: sepolia.id })}
            >
              {isPending ? "Switching…" : "Switch to Sepolia"}
            </Button>
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
