"use client";

import {
  useAccount,
  useReadContracts,
  useChainId,
} from "wagmi";
import {
  bankStatsContracts,
  isBankStatsQueryEnabled,
  isUserUsdcBalanceQueryEnabled,
  userUsdcBalanceContracts,
} from "@/lib/bank-contracts";
import { mapBankStats } from "@/lib/bank-stats";
import { getKipuBankAddress, SEPOLIA_CHAIN_ID } from "@/lib/constants";

export function useKipuBankAddress() {
  return getKipuBankAddress();
}

export function useIsConfigured() {
  return !!getKipuBankAddress();
}

export function useIsSepolia() {
  const chainId = useChainId();
  return chainId === SEPOLIA_CHAIN_ID;
}

export function useBankStats() {
  const address = getKipuBankAddress();

  return useReadContracts({
    contracts: address ? bankStatsContracts(address) : [],
    query: {
      enabled: isBankStatsQueryEnabled(address),
    },
  });
}

export function useUserUsdcBalance() {
  const address = getKipuBankAddress();
  const { address: userAddress } = useAccount();

  const bankStats = useBankStats();
  const usdcAddress = mapBankStats(bankStats.data).usdc;

  return useReadContracts({
    contracts:
      address && userAddress && usdcAddress
        ? userUsdcBalanceContracts(address, userAddress, usdcAddress)
        : [],
    query: {
      enabled: isUserUsdcBalanceQueryEnabled(address, userAddress, usdcAddress),
    },
  });
}

export const bankQueryKeys = {
  stats: ["bank-stats"] as const,
  userBalance: (user?: string) => ["user-usdc-balance", user] as const,
};
