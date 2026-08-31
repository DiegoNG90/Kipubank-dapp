import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BankPanel } from "@/components/bank-panel";

const bankPanelState = {
  isConfigured: true,
  isConnected: false,
  bankStats: {
    isLoading: false,
    data: [
      { result: 10_000_000n },
      { result: 2_500_000n },
      { result: 12n },
      { result: 3n },
      { result: 500_000n },
      { result: 100n },
      { result: "0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238" },
    ] as Array<{ result: unknown }>,
  },
  userBalance: {
    data: [{ result: 1_000_000n }] as Array<{ result: unknown }>,
  },
};

vi.mock("@/hooks/use-kipubank", () => ({
  useIsConfigured: () => bankPanelState.isConfigured,
  useBankStats: () => bankPanelState.bankStats,
  useUserUsdcBalance: () => bankPanelState.userBalance,
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ isConnected: bankPanelState.isConnected }),
}));

describe("BankPanel", () => {
  beforeEach(() => {
    bankPanelState.isConfigured = true;
    bankPanelState.isConnected = false;
    bankPanelState.bankStats = {
      isLoading: false,
      data: [
        { result: 10_000_000n },
        { result: 2_500_000n },
        { result: 12n },
        { result: 3n },
        { result: 500_000n },
        { result: 100n },
        { result: "0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238" },
      ],
    };
    bankPanelState.userBalance = {
      data: [{ result: 1_000_000n }],
    };
  });

  it("prompts for contract configuration when the address is missing", () => {
    bankPanelState.isConfigured = false;

    render(<BankPanel />);

    expect(screen.getByText("Contract not configured")).toBeInTheDocument();
    expect(screen.getByText(/NEXT_PUBLIC_KIPUBANK_ADDRESS/i)).toBeInTheDocument();
  });

  it("shows a loading state while bank stats are fetching", () => {
    bankPanelState.bankStats = { isLoading: true, data: undefined };

    render(<BankPanel />);

    expect(screen.queryByText("Bank Overview")).not.toBeInTheDocument();
  });

  it("renders mapped vault stats", () => {
    render(<BankPanel />);

    expect(screen.getByText("Bank Overview")).toBeInTheDocument();
    expect(screen.getByText(/\$2[.,]50/)).toBeInTheDocument();
    expect(screen.getByText(/\$10[.,]00/)).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(screen.getByText("1.00%")).toBeInTheDocument();
  });

  it("shows the connected user's USDC balance", () => {
    bankPanelState.isConnected = true;

    render(<BankPanel />);

    expect(screen.getByText("Your USDC balance")).toBeInTheDocument();
    expect(screen.getByText(/\$1[.,]00/)).toBeInTheDocument();
  });
});
