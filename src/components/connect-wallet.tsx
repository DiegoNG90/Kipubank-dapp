"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ExternalLink, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWalletAvailability } from "@/hooks/use-wallet-availability";
import {
  METAMASK_DOWNLOAD_URL,
  resolveWalletAvailability,
} from "@/lib/metamask";
import {
  classifyConnectError,
  shouldOpenWalletGuide,
} from "@/lib/wallet-ui";
import { truncateAddress } from "@/lib/utils";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const availability = useWalletAvailability();

  const [installOpen, setInstallOpen] = useState(false);
  const [dismissedGuideError, setDismissedGuideError] = useState<string | null>(
    null,
  );
  const [isDetecting, setIsDetecting] = useState(false);

  const connector =
    connectors.find((item) => item.id === "metaMask") ??
    connectors.find((item) => item.id === "injected") ??
    connectors[0];

  const classifiedError = error ? classifyConnectError(error) : null;
  const guideErrorKey =
    error && shouldOpenWalletGuide(error)
      ? classifiedError?.message ?? error.message
      : null;
  const guideOpen =
    guideErrorKey !== null && dismissedGuideError !== guideErrorKey;

  async function handleConnect() {
    setIsDetecting(true);
    try {
      const resolved = await resolveWalletAvailability();
      if (resolved === "not-installed") {
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

  const busy = isPending || isDetecting || availability === "detecting";

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        {availability === "installed" && !error && (
          <p className="max-w-xs text-right text-xs text-zinc-500">
            MetaMask detectada. Abrí la extensión si no aparece el popup al
            conectar.
          </p>
        )}

        <Button onClick={handleConnect} disabled={busy}>
          <Wallet className="h-4 w-4" />
          {busy ? "Connecting…" : "Connect MetaMask"}
        </Button>

        {classifiedError && (
          <Alert
            variant={classifiedError.kind === "pending" ? "warning" : "destructive"}
            className="max-w-xs text-left"
          >
            <AlertDescription>{classifiedError.message}</AlertDescription>
          </Alert>
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

      <Modal
        open={guideOpen}
        title="Abrí MetaMask para conectar"
        onClose={() => setDismissedGuideError(guideErrorKey)}
      >
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-zinc-300">
          <li>
            Hacé clic en el ícono de MetaMask (el zorro) en la barra de
            extensiones de tu navegador.
          </li>
          <li>Desbloqueá tu wallet si te lo pide.</li>
          <li>
            Volvé a esta página y tocá{" "}
            <span className="font-medium text-zinc-100">Connect MetaMask</span>{" "}
            de nuevo.
          </li>
        </ol>
        <p className="mt-4 text-xs text-zinc-500">
          Si ya tenés una solicitud pendiente, respondela en la ventana de
          MetaMask antes de reintentar.
        </p>
        <Button
          className="mt-4 w-full"
          onClick={() => setDismissedGuideError(guideErrorKey)}
        >
          Entendido
        </Button>
        <Button
          className="mt-2 w-full"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setDismissedGuideError(guideErrorKey);
            void handleConnect();
          }}
        >
          Reintentar conexión
        </Button>
      </Modal>
    </>
  );
}
