import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionHistory } from "@/components/transaction-history";
import { renderWithProviders } from "@/test/render";

const historyState = {
  isConnected: false,
  address: undefined as `0x${string}` | undefined,
  history: {
    isLoading: false,
    isError: false,
    data: [] as Array<{
      type: "deposit-eth";
      txHash: `0x${string}`;
      blockNumber: bigint;
      symbol: string;
      inputAmount: bigint;
      inputDecimals: number;
      creditedUsdc?: bigint;
      timestamp?: number;
    }>,
  },
};

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useAccount: () => ({
      isConnected: historyState.isConnected,
      address: historyState.address,
    }),
  };
});

vi.mock("@/hooks/use-kipubank", () => ({
  useBankStats: () => ({
    data: [{ result: "0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238" }],
  }),
}));

vi.mock("@/hooks/use-tx-history", () => ({
  useTxHistory: () => historyState.history,
}));

describe("TransactionHistory", () => {
  beforeEach(() => {
    historyState.isConnected = false;
    historyState.address = undefined;
    historyState.history = {
      isLoading: false,
      isError: false,
      data: [],
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prompts to connect when disconnected", () => {
    renderWithProviders(<TransactionHistory />);
    expect(
      screen.getByText(/Connect MetaMask to see your KipuBank activity/i),
    ).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    historyState.isConnected = true;
    historyState.address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    historyState.history.isLoading = true;
    renderWithProviders(<TransactionHistory />);
    expect(screen.getByText(/Loading on-chain history/i)).toBeInTheDocument();
  });

  it("renders history rows for the connected user", () => {
    historyState.isConnected = true;
    historyState.address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    historyState.history.data = [
      {
        type: "deposit-eth",
        txHash:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
        blockNumber: 100n,
        symbol: "ETH",
        inputAmount: 1_000_000_000_000_000_000n,
        inputDecimals: 18,
        creditedUsdc: 2_500_000n,
        timestamp: 1_700_000_000,
      },
    ];

    renderWithProviders(<TransactionHistory />);

    expect(screen.getByText("Deposit ETH")).toBeInTheDocument();
    expect(screen.getByText(/1 ETH/i)).toBeInTheDocument();
    expect(screen.getByText(/\$2[.,]50/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /etherscan/i })).toHaveAttribute(
      "href",
      expect.stringContaining("sepolia.etherscan.io/tx/"),
    );
  });

  it("explains an empty scan and links to Etherscan", () => {
    historyState.isConnected = true;
    historyState.address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    vi.stubEnv(
      "NEXT_PUBLIC_KIPUBANK_ADDRESS",
      "0xd8473b57CAdEd25D7b41b4c451e74C1Bf92DD3ca",
    );
    renderWithProviders(<TransactionHistory />);

    expect(
      screen.getByText(/not an Etherscan transaction scanner/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /your Etherscan address/i }),
    ).toHaveAttribute(
      "href",
      "https://sepolia.etherscan.io/address/0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4",
    );
  });
});
