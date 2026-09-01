import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WithdrawUsdc } from "@/components/withdraw-usdc";
import { renderWithProviders } from "@/test/render";

const writeContract = vi.fn();

const withdrawState = {
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
    ] as Array<{ result: unknown }>,
  },
  userBalance: {
    data: [{ result: 1_000_000n }] as Array<{ result: unknown }>,
  },
};

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useAccount: () => ({ isConnected: withdrawState.isConnected }),
    useSimulateContract: () => ({
      data: undefined,
      error: null,
      isFetching: false,
    }),
    useWriteContract: () => ({
      writeContract,
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
  useBankStats: () => withdrawState.bankStats,
  useUserUsdcBalance: () => withdrawState.userBalance,
}));

describe("WithdrawUsdc", () => {
  beforeEach(() => {
    withdrawState.isConnected = false;
    vi.stubEnv(
      "NEXT_PUBLIC_KIPUBANK_ADDRESS",
      "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prompts to connect when the wallet is disconnected", () => {
    renderWithProviders(<WithdrawUsdc />);
    expect(screen.getByText(/Connect MetaMask to withdraw/i)).toBeInTheDocument();
  });

  it("shows client validation when the amount exceeds balance", async () => {
    const user = userEvent.setup();
    withdrawState.isConnected = true;
    renderWithProviders(<WithdrawUsdc />);

    await user.type(screen.getByLabelText(/Amount \(USDC\)/i), "2");
    expect(await screen.findByText(/Insufficient balance/i)).toBeInTheDocument();
  });

  it("fills the max withdrawable amount", async () => {
    const user = userEvent.setup();
    withdrawState.isConnected = true;
    renderWithProviders(<WithdrawUsdc />);

    await user.click(screen.getByRole("button", { name: /max/i }));
    expect(screen.getByLabelText(/Amount \(USDC\)/i)).toHaveValue(0.5);
  });
});
