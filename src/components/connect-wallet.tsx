"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ExternalLink, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { canOpenWallet, METAMASK_DOWNLOAD_URL } from "@/lib/metamask";
import { truncateAddress } from "@/lib/utils";

function providerHint(message: string | undefined) {
  if (message?.toLowerCase().includes("provider not found")) {
    return "No se encontró un provider. Recargá la página con MetaMask desbloqueada.";
  }
  return message;
}

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [installOpen, setInstallOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const connector =
    connectors.find((item) => item.id === "metaMask") ??
    connectors.find((item) => item.id === "injected") ??
    connectors[0];

  async function handleConnect() {
    setIsDetecting(true);
    try {
      if (!(await canOpenWallet())) {
        setInstallOpen(true);
        return;
      }
      if (connector) connect({ connector });
    } finally {
      setIsDetecting(false);
    }
  }

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

  const busy = isPending || isDetecting;

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        <Button onClick={handleConnect} disabled={busy}>
          <Wallet className="h-4 w-4" />
          {busy ? "Connecting…" : "Connect MetaMask"}
        </Button>
        {error && (
          <p className="max-w-xs text-right text-xs text-red-400">
            {providerHint(error.message)}
          </p>
        )}
      </div>

      <Modal
        open={installOpen}
        title="MetaMask no está instalada"
        onClose={() => setInstallOpen(false)}
      >
        <p className="text-sm leading-relaxed text-zinc-400">
          Para conectar tu wallet necesitás la extensión de MetaMask en este
          navegador. Podés descargarla desde el sitio oficial:
        </p>
        <a
          href={METAMASK_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-900/20 transition-colors hover:bg-emerald-500"
        >
          Descargar MetaMask
          <ExternalLink className="h-4 w-4" />
        </a>
        <p className="mt-3 text-xs text-zinc-500">
          Después de instalarla, recargá esta página y volvé a conectar.
        </p>
      </Modal>
    </>
  );
}
