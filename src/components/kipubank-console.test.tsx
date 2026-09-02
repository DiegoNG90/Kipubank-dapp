import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KipuBankConsole } from "@/components/kipubank-console";
import { renderWithProviders } from "@/test/render";

vi.mock("@/hooks/use-kipubank", () => ({
  useIsConfigured: () => true,
  useBankStats: () => ({
    isLoading: false,
    data: [
      { result: 10_000_000n },
      { result: 2_500_000n },
      { result: 12n },
      { result: 3n },
      { result: 500_000n },
      { result: 100n },
      { result: "0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238" },
      { result: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" },
    ],
  }),
  useUserUsdcBalance: () => ({ data: [{ result: 0n }] }),
  useIsSepolia: () => true,
}));

describe("KipuBankConsole", () => {
  beforeEach(() => {
    vi.stubEnv(
      "NEXT_PUBLIC_KIPUBANK_ADDRESS",
      "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the console shell and primary bank actions", () => {
    renderWithProviders(<KipuBankConsole />);

    expect(screen.getByText("KipuBank Console")).toBeInTheDocument();
    expect(screen.getByText(/Sepolia testnet only/i)).toBeInTheDocument();
    expect(screen.getByText("Bank Overview")).toBeInTheDocument();
    expect(screen.getByText("Deposit ETH")).toBeInTheDocument();
    expect(screen.getByText("Deposit ERC-20")).toBeInTheDocument();
    expect(screen.getByText("Withdraw USDC")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /connect metamask/i }),
    ).toBeInTheDocument();
  });
});
