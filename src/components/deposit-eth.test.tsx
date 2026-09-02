import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DepositEth } from "@/components/deposit-eth";
import { renderWithProviders } from "@/test/render";

const depositEthState = {
  isConnected: false,
  bankStats: {
    data: [
      { result: 10_000_000n },
      { result: 0n },
      { result: 0n },
      { result: 0n },
      { result: 500_000n },
      { result: 100n },
      { result: "0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238" },
      { result: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" },
    ] as Array<{ result: unknown }>,
  },
};

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useAccount: () => ({ isConnected: depositEthState.isConnected }),
    useReadContract: () => ({ data: undefined, isFetching: false }),
    useSimulateContract: () => ({
      data: undefined,
      error: null,
      isFetching: false,
    }),
    useWriteContract: () => ({
      writeContract: vi.fn(),
      data: undefined,
      isPending: false,
      error: null,
      reset: vi.fn(),
    }),
    useWaitForTransactionReceipt: () => ({
      isLoading: false,
      isSuccess: false,
    }),
  };
});

vi.mock("@/hooks/use-kipubank", () => ({
  useBankStats: () => depositEthState.bankStats,
  useIsSepolia: () => true,
}));

describe("DepositEth", () => {
  beforeEach(() => {
    depositEthState.isConnected = false;
    vi.stubEnv(
      "NEXT_PUBLIC_KIPUBANK_ADDRESS",
      "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prompts to connect when the wallet is disconnected", () => {
    renderWithProviders(<DepositEth />);
    expect(screen.getByText(/Connect MetaMask to deposit/i)).toBeInTheDocument();
  });

  it("shows the amount input when connected", () => {
    depositEthState.isConnected = true;
    renderWithProviders(<DepositEth />);
    expect(screen.getByLabelText(/Amount \(ETH\)/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /deposit eth/i }),
    ).toBeDisabled();
  });
});
