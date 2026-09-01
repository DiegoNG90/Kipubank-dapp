import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { kipuBankAbi } from "@/lib/abis/kipubank";
import {
  bankStatsContracts,
  isBankStatsQueryEnabled,
  isUserUsdcBalanceQueryEnabled,
  userUsdcBalanceContracts,
} from "@/lib/bank-contracts";

const bank = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
const user = "0x0000000000000000000000000000000000000001";
const usdc = getAddress("0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238");

describe("bankStatsContracts", () => {
  it("lists every on-chain stat read in display order", () => {
    const contracts = bankStatsContracts(bank);
    expect(contracts.map((item) => item.functionName)).toEqual([
      "BANKCAP",
      "totalDepositsInUSD",
      "totalDepositOperations",
      "totalWithdrawalsOperations",
      "MAXIMUM_WITHDRAWAL_IN_USD",
      "SLIPPAGE_TOLERANCE_BPS",
      "USDC",
      "ROUTER",
      "WETH",
      "owner",
    ]);
    expect(contracts.every((item) => item.address === bank)).toBe(true);
  });
});

describe("userUsdcBalanceContracts", () => {
  it("reads the user USDC balance from the bank contract", () => {
    expect(userUsdcBalanceContracts(bank, user, usdc)).toEqual([
      {
        address: bank,
        abi: kipuBankAbi,
        functionName: "balances",
        args: [user, usdc],
      },
    ]);
  });
});

describe("query enabled flags", () => {
  it("enables bank stats only when the contract address exists", () => {
    expect(isBankStatsQueryEnabled(bank)).toBe(true);
    expect(isBankStatsQueryEnabled(undefined)).toBe(false);
  });

  it("enables user balance only when bank, user, and USDC are known", () => {
    expect(isUserUsdcBalanceQueryEnabled(bank, user, usdc)).toBe(true);
    expect(isUserUsdcBalanceQueryEnabled(undefined, user, usdc)).toBe(false);
    expect(isUserUsdcBalanceQueryEnabled(bank, undefined, usdc)).toBe(false);
    expect(isUserUsdcBalanceQueryEnabled(bank, user, undefined)).toBe(false);
  });
});
