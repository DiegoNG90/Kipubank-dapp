import { describe, expect, it } from "vitest";
import { SEPOLIA_USDC } from "@/lib/constants";
import {
  buildBlockRanges,
  buildHistoryEntries,
  filterDepositsBySender,
  formatHistoryTypeLabel,
  formatRelativeTime,
  mergeCreditedFromUsdcTransfers,
  sortHistoryDesc,
} from "@/lib/tx-history";

const user = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4" as const;
const other = "0x0000000000000000000000000000000000000002" as const;
const tx1 =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as const;
const tx2 =
  "0x2222222222222222222222222222222222222222222222222222222222222222" as const;

describe("buildBlockRanges", () => {
  it("splits a range into chunks", () => {
    expect(buildBlockRanges(0n, 12_000n, 5_000n)).toEqual([
      { from: 0n, to: 4999n },
      { from: 5000n, to: 9999n },
      { from: 10_000n, to: 12_000n },
    ]);
  });

  it("returns an empty array for invalid input", () => {
    expect(buildBlockRanges(10n, 5n, 5_000n)).toEqual([]);
  });
});

describe("filterDepositsBySender", () => {
  it("keeps only logs for the connected user", () => {
    const logs = [
      { args: { _sender: user } },
      { args: { _sender: other } },
    ];
    expect(filterDepositsBySender(logs, user)).toHaveLength(1);
  });
});

describe("mergeCreditedFromUsdcTransfers", () => {
  it("joins credited USDC by transaction hash", () => {
    const entries = buildHistoryEntries({
      etherDeposits: [
        {
          transactionHash: tx1,
          blockNumber: 100n,
          args: { _sender: user, _deposit: 1_000_000_000_000_000_000n },
        },
      ],
      tokenDeposits: [],
      withdrawals: [],
      userAddress: user,
      usdcTransfers: [{ transactionHash: tx1, args: { value: 2_500_000n } }],
      maxEntries: 10,
    });

    expect(entries[0]?.creditedUsdc).toBe(2_500_000n);
  });
});

describe("buildHistoryEntries", () => {
  it("builds sorted user history across deposits and withdrawals", () => {
    const entries = buildHistoryEntries({
      etherDeposits: [
        {
          transactionHash: tx1,
          blockNumber: 100n,
          args: { _sender: user, _deposit: 1n },
        },
        {
          transactionHash: tx2,
          blockNumber: 50n,
          args: { _sender: other, _deposit: 1n },
        },
      ],
      tokenDeposits: [
        {
          transactionHash: tx2,
          blockNumber: 200n,
          args: {
            _sender: user,
            _tokenAddress: SEPOLIA_USDC,
            _amount: 1_000_000n,
          },
        },
      ],
      withdrawals: [
        {
          transactionHash: tx1,
          blockNumber: 300n,
          args: {
            _sender: user,
            _tokenAddress: SEPOLIA_USDC,
            _amount: 500_000n,
          },
        },
      ],
      userAddress: user,
      usdcTransfers: [],
      symbolsByAddress: { [SEPOLIA_USDC.toLowerCase()]: "USDC" },
      decimalsByAddress: { [SEPOLIA_USDC.toLowerCase()]: 6 },
      timestampsByBlock: {
        "100": 1_700_000_000,
        "200": 1_700_000_100,
        "300": 1_700_000_200,
      },
      maxEntries: 10,
    });

    expect(entries).toHaveLength(3);
    expect(entries[0]?.type).toBe("withdraw");
    expect(entries[1]?.type).toBe("deposit-token");
    expect(entries[2]?.type).toBe("deposit-eth");
    expect(entries[1]?.timestamp).toBe(1_700_000_100);
  });

  it("respects the max entry limit", () => {
    const entries = buildHistoryEntries({
      etherDeposits: Array.from({ length: 5 }, (_, index) => ({
        transactionHash: `0x${String(index + 1).padStart(64, "0")}` as `0x${string}`,
        blockNumber: BigInt(index + 1),
        args: { _sender: user, _deposit: 1n },
      })),
      tokenDeposits: [],
      withdrawals: [],
      userAddress: user,
      usdcTransfers: [],
      maxEntries: 3,
    });

    expect(entries).toHaveLength(3);
    expect(sortHistoryDesc(entries)[0]?.blockNumber).toBe(5n);
  });
});

describe("formatters", () => {
  it("labels entry types", () => {
    expect(formatHistoryTypeLabel("deposit-eth")).toBe("Deposit ETH");
    expect(formatHistoryTypeLabel("withdraw")).toBe("Withdraw USDC");
  });

  it("formats relative timestamps", () => {
    const now = 1_700_000_000_000;
    expect(formatRelativeTime(1_700_000_000, now)).toBe("just now");
    expect(formatRelativeTime(1_699_999_100, now)).toBe("15m ago");
  });
});
