import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DepositTokenWizard } from "@/components/deposit-token-wizard";
import { SEPOLIA_USDC } from "@/lib/constants";
import { renderWithProviders } from "@/test/render";

const wizardState = {
  isConnected: false,
  address: undefined as `0x${string}` | undefined,
  bankStats: {
    data: [
      { result: 10_000_000n },
      { result: 0n },
      { result: 0n },
      { result: 0n },
      { result: 500_000n },
      { result: 50n },
      { result: SEPOLIA_USDC },
      { result: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" },
    ] as Array<{ result: unknown }>,
  },
  tokenMeta: {
    data: [{ result: 6 }, { result: "USDC" }] as Array<{ result: unknown }>,
  },
  tokenBalance: 1_000_000_000n,
  allowance: undefined as bigint | undefined,
};

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useAccount: () => ({
      isConnected: wizardState.isConnected,
      address: wizardState.address,
    }),
    useReadContract: ({ functionName }: { functionName: string }) => {
      if (functionName === "allowance") {
        return { data: wizardState.allowance, refetch: vi.fn() };
      }
      if (functionName === "balanceOf") {
        return { data: wizardState.tokenBalance };
      }
      return { data: undefined, isFetching: false };
    },
    useReadContracts: () => ({ data: wizardState.tokenMeta.data }),
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
  useBankStats: () => wizardState.bankStats,
  useIsSepolia: () => true,
}));

describe("DepositTokenWizard", () => {
  beforeEach(() => {
    wizardState.isConnected = false;
    wizardState.address = undefined;
    wizardState.allowance = undefined;
    wizardState.tokenBalance = 1_000_000_000n;
    vi.stubEnv(
      "NEXT_PUBLIC_KIPUBANK_ADDRESS",
      "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prompts to connect when the wallet is disconnected", () => {
    renderWithProviders(<DepositTokenWizard />);
    expect(screen.getByText(/Connect MetaMask to deposit/i)).toBeInTheDocument();
  });

  it("opens the guided wizard when connected", async () => {
    const user = userEvent.setup();
    wizardState.isConnected = true;
    wizardState.address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    renderWithProviders(<DepositTokenWizard />);

    await user.click(
      screen.getByRole("button", { name: /start erc-20 deposit/i }),
    );

    const dialog = await screen.findByRole("dialog", { name: /deposit erc-20/i });
    expect(within(dialog).getByText("Token")).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(/token address/i),
    ).toBeInTheDocument();
  });

  it("flags an invalid token address in the wizard", async () => {
    const user = userEvent.setup();
    wizardState.isConnected = true;
    wizardState.address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    renderWithProviders(<DepositTokenWizard />);

    await user.click(
      screen.getByRole("button", { name: /start erc-20 deposit/i }),
    );

    const input = await screen.findByLabelText(/token address/i);
    await user.clear(input);
    await user.type(input, "0x123");
    expect(screen.getByText(/invalid ethereum address/i)).toBeInTheDocument();
  });

  it("shows direct USDC guidance on the amount step", async () => {
    const user = userEvent.setup({ delay: null });
    wizardState.isConnected = true;
    wizardState.address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    renderWithProviders(<DepositTokenWizard />);

    await user.click(
      screen.getByRole("button", { name: /start erc-20 deposit/i }),
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.type(screen.getByLabelText(/amount \(usdc\)/i), "10");
    await waitFor(() => {
      expect(
        screen.getByText(/Direct USDC deposit — no swap required/i),
      ).toBeInTheDocument();
    });
  });

  it("routes to approve when allowance is insufficient", async () => {
    const user = userEvent.setup({ delay: null });
    wizardState.isConnected = true;
    wizardState.address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    wizardState.allowance = 0n;
    renderWithProviders(<DepositTokenWizard />);

    await user.click(
      screen.getByRole("button", { name: /start erc-20 deposit/i }),
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.type(screen.getByLabelText(/amount \(usdc\)/i), "1");
    await waitFor(() => {
      expect(screen.getByText(/Minimum you receive/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByRole("button", { name: /approve usdc/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/MetaMask will ask you to approve/i),
    ).toBeInTheDocument();
  });
});
