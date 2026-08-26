"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/utils";

function hasInjectedProvider() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

function providerHint(message: string | undefined) {
  if (!hasInjectedProvider()) {
    return "MetaMask no está inyectado en este navegador. Abrí localhost en Chrome/Brave/Firefox con la extensión instalada y desbloqueada (el preview de Cursor no tiene extensiones).";
  }
  if (message?.toLowerCase().includes("provider not found")) {
    return "wagmi no encontró un provider. Probá recargar la página con MetaMask desbloqueado, o desactivá otras wallets que pisen window.ethereum.";
  }
  return message;
}

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  const connector =
    connectors.find((item) => item.id === "metaMask") ??
    connectors.find((item) => item.id === "injected") ??
    connectors[0];

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-300 sm:inline">
          {truncateAddress(address, 6)}
        </span>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          <LogOut className="h-4 w-4" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={() => {
          if (connector) connect({ connector });
        }}
        disabled={isPending || !connector}
      >
        <Wallet className="h-4 w-4" />
        {isPending ? "Connecting…" : "Connect MetaMask"}
      </Button>
      {error && (
        <p className="max-w-xs text-right text-xs text-red-400">
          {providerHint(error.message)}
        </p>
      )}
    </div>
  );
}
