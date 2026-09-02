"use client";

import { ConnectWallet } from "@/components/connect-wallet";
import { NetworkGuard } from "@/components/network-guard";
import { BankPanel } from "@/components/bank-panel";
import { DepositEth } from "@/components/deposit-eth";
import { DepositToken } from "@/components/deposit-token";
import { WithdrawUsdc } from "@/components/withdraw-usdc";
import { Landmark } from "lucide-react";

export function KipuBankConsole() {
  return (
    <div className="min-h-full bg-zinc-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-950 to-zinc-950" />

      <header className="relative border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 ring-1 ring-emerald-500/30">
              <Landmark className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-50">
                KipuBank Console
              </h1>
              <p className="text-xs text-zinc-500">Sepolia · MetaMask</p>
            </div>
          </div>
          <ConnectWallet />
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Sepolia testnet only. Do not send mainnet funds. This UI never asks
          for a private key — connect MetaMask and confirm in the wallet.
        </div>
        <NetworkGuard>
          <BankPanel />

          <div className="grid gap-6 lg:grid-cols-3">
            <DepositEth />
            <DepositToken />
            <WithdrawUsdc />
          </div>
        </NetworkGuard>
      </main>

      <footer className="relative border-t border-zinc-800/60 py-6 text-center text-xs text-zinc-600">
        KipuBankV3 · Uniswap V2 vault · No backend
      </footer>
    </div>
  );
}
