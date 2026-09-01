import { kipuBankAbi } from "@/lib/abis/kipubank";

type BankContractRead = {
  address: `0x${string}`;
  abi: typeof kipuBankAbi;
  functionName: string;
  args?: readonly unknown[];
};

export function bankStatsContracts(
  address: `0x${string}`,
): BankContractRead[] {
  return [
    { address, abi: kipuBankAbi, functionName: "BANKCAP" },
    { address, abi: kipuBankAbi, functionName: "totalDepositsInUSD" },
    { address, abi: kipuBankAbi, functionName: "totalDepositOperations" },
    { address, abi: kipuBankAbi, functionName: "totalWithdrawalsOperations" },
    { address, abi: kipuBankAbi, functionName: "MAXIMUM_WITHDRAWAL_IN_USD" },
    { address, abi: kipuBankAbi, functionName: "SLIPPAGE_TOLERANCE_BPS" },
    { address, abi: kipuBankAbi, functionName: "USDC" },
    { address, abi: kipuBankAbi, functionName: "ROUTER" },
    { address, abi: kipuBankAbi, functionName: "WETH" },
    { address, abi: kipuBankAbi, functionName: "owner" },
  ];
}

export function userUsdcBalanceContracts(
  bankAddress: `0x${string}`,
  userAddress: `0x${string}`,
  usdcAddress: `0x${string}`,
): BankContractRead[] {
  return [
    {
      address: bankAddress,
      abi: kipuBankAbi,
      functionName: "balances",
      args: [userAddress, usdcAddress],
    },
  ];
}

export function isBankStatsQueryEnabled(address: `0x${string}` | undefined) {
  return !!address;
}

export function isUserUsdcBalanceQueryEnabled(
  bankAddress: `0x${string}` | undefined,
  userAddress: `0x${string}` | undefined,
  usdcAddress: `0x${string}` | undefined,
) {
  return !!bankAddress && !!userAddress && !!usdcAddress;
}
