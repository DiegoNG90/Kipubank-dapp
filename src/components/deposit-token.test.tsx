import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DepositToken } from "@/components/deposit-token";
import { SEPOLIA_USDC } from "@/lib/constants";
import { renderWithProviders } from "@/test/render";

const depositTokenState = {
  isConnected: false,
  address: undefined as `0x${string}` | undefined,
  bankStats: {
    data: [
      { result: 10_000_000n },
      { result: 0n },
      { result: 0n },
      { result: 0n },
      { result: 500_000n },
      { result: 100n },
      { result: SEPOLIA_USDC },
      { result: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" },
    ] as Array<{ result: unknown }>,
  },
  tokenMeta: {
    data: [{ result: 6 }, { result: "USDC" }] as Array<{ result: unknown }>,
  },
  allowance: undefined as bigint | undefined,
};

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useAccount: () => ({
      isConnected: depositTokenState.isConnected,
      address: depositTokenState.address,
    }),
    useReadContract: ({ functionName }: { functionName: string }) => {
      if (functionName === "allowance") {
        return { data: depositTokenState.allowance };
      }
      return { data: undefined, isFetching: false };
    },
    useReadContracts: () => ({ data: depositTokenState.tokenMeta.data }),
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
  useBankStats: () => depositTokenState.bankStats,
  useIsSepolia: () => true,
}));

describe("DepositToken", () => {
  beforeEach(() => {
    depositTokenState.isConnected = false;
    depositTokenState.address = undefined;
    depositTokenState.allowance = undefined;
    vi.stubEnv(
      "NEXT_PUBLIC_KIPUBANK_ADDRESS",
      "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prompts to connect when the wallet is disconnected", () => {
    renderWithProviders(<DepositToken />);
    expect(screen.getByText(/Connect MetaMask to deposit/i)).toBeInTheDocument();
  });

  it("flags an invalid token address", async () => {
    const user = userEvent.setup();
    depositTokenState.isConnected = true;
    depositTokenState.address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    renderWithProviders(<DepositToken />);

    await user.clear(screen.getByLabelText(/Token address/i));
    await user.type(screen.getByLabelText(/Token address/i), "0x123");
    expect(screen.getByText(/Invalid address/i)).toBeInTheDocument();
  });

  it("shows direct USDC deposit copy for USDC", async () => {
    const user = userEvent.setup({ delay: null });
    depositTokenState.isConnected = true;
    depositTokenState.address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    renderWithProviders(<DepositToken />);

    await user.type(screen.getByLabelText(/Amount \(USDC\)/i), "10");
    await waitFor(() => {
      expect(
        screen.getByText(/Direct USDC deposit — no swap required/i),
      ).toBeInTheDocument();
    });
  });

  it("offers approve when allowance is insufficient", async () => {
    const user = userEvent.setup({ delay: null });
    depositTokenState.isConnected = true;
    depositTokenState.address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    depositTokenState.allowance = 0n;
    renderWithProviders(<DepositToken />);

    await user.type(screen.getByLabelText(/Amount \(USDC\)/i), "1");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /approve usdc/i }),
      ).toBeInTheDocument();
    });
  });
});
