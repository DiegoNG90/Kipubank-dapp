"use client";

import {
  useAccount,
  useReadContracts,
  useChainId,
} from "wagmi";
import { kipuBankAbi } from "@/lib/abis/kipubank";
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
    contracts: address
      ? [
          { address, abi: kipuBankAbi, functionName: "BANKCAP" },
          { address, abi: kipuBankAbi, functionName: "totalDepositsInUSD" },
          {
            address,
            abi: kipuBankAbi,
            functionName: "totalDepositOperations",
          },
          {
            address,
            abi: kipuBankAbi,
            functionName: "totalWithdrawalsOperations",
          },
          {
            address,
            abi: kipuBankAbi,
            functionName: "MAXIMUM_WITHDRAWAL_IN_USD",
          },
          {
            address,
            abi: kipuBankAbi,
            functionName: "SLIPPAGE_TOLERANCE_BPS",
          },
          { address, abi: kipuBankAbi, functionName: "USDC" },
          { address, abi: kipuBankAbi, functionName: "ROUTER" },
          { address, abi: kipuBankAbi, functionName: "WETH" },
          { address, abi: kipuBankAbi, functionName: "owner" },
        ]
      : [],
    query: {
      enabled: !!address,
    },
  });
}

export function useUserUsdcBalance() {
  const address = getKipuBankAddress();
  const { address: userAddress } = useAccount();

  const bankStats = useBankStats();
  const usdcAddress = bankStats.data?.[6]?.result as `0x${string}` | undefined;

  return useReadContracts({
    contracts:
      address && userAddress && usdcAddress
        ? [
            {
              address,
              abi: kipuBankAbi,
              functionName: "balances",
              args: [userAddress, usdcAddress],
            },
          ]
        : [],
    query: {
      enabled: !!address && !!userAddress && !!usdcAddress,
    },
  });
}

export const bankQueryKeys = {
  stats: ["bank-stats"] as const,
  userBalance: (user?: string) => ["user-usdc-balance", user] as const,
};
