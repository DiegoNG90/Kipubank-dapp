import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectWallet } from "@/components/connect-wallet";
import { METAMASK_DOWNLOAD_URL } from "@/lib/metamask";
import { setEthereum } from "@/test/ethereum";

const connect = vi.fn();
const disconnect = vi.fn();

const wagmiState = {
  address: undefined as `0x${string}` | undefined,
  isConnected: false,
  isPending: false,
  error: null as Error | null,
};

const availabilityState = {
  value: "installed" as "installed" | "not-installed" | "detecting",
};

vi.mock("@/hooks/use-wallet-availability", () => ({
  useWalletAvailability: () => availabilityState.value,
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: wagmiState.address,
    isConnected: wagmiState.isConnected,
  }),
  useConnect: () => ({
    connect,
    connectors: [{ id: "injected" }],
    isPending: wagmiState.isPending,
    error: wagmiState.error,
  }),
  useDisconnect: () => ({ disconnect }),
}));

describe("ConnectWallet", () => {
  beforeEach(() => {
    connect.mockReset();
    disconnect.mockReset();
    wagmiState.address = undefined;
    wagmiState.isConnected = false;
    wagmiState.isPending = false;
    wagmiState.error = null;
    availabilityState.value = "installed";
    delete (window as Window & { ethereum?: unknown }).ethereum;
  });

  it("opens the install modal instead of connecting when MetaMask is missing", async () => {
    const user = userEvent.setup();
    render(<ConnectWallet />);

    await user.click(screen.getByRole("button", { name: /connect metamask/i }));

    expect(connect).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("dialog", { name: "MetaMask no está instalada" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /descargar metamask/i })).toHaveAttribute(
      "href",
      METAMASK_DOWNLOAD_URL,
    );
  });

  it("connects through the injected connector when MetaMask is installed", async () => {
    const user = userEvent.setup();
    setEthereum({ isMetaMask: true });
    render(<ConnectWallet />);

    await user.click(screen.getByRole("button", { name: /connect metamask/i }));

    await waitFor(() => {
      expect(connect).toHaveBeenCalledWith({ connector: { id: "injected" } });
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows guidance when MetaMask is detected but not opened", () => {
    availabilityState.value = "installed";
    render(<ConnectWallet />);

    expect(
      screen.getByText(/MetaMask detectada/i),
    ).toBeInTheDocument();
  });

  it("opens the wallet guide when the provider is missing after install", async () => {
    wagmiState.error = new Error("Provider not found");
    render(<ConnectWallet />);

    expect(
      await screen.findByRole("dialog", { name: /abrí metamask para conectar/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ícono de MetaMask/i)).toBeInTheDocument();
  });

  it("shows a pending-request warning for -32002 errors", () => {
    wagmiState.error = {
      name: "ProviderRpcError",
      message: "Request of type eth_requestAccounts already pending",
      code: -32002,
    } as Error & { code: number };

    render(<ConnectWallet />);

    expect(
      screen.getByText(/Ya hay una solicitud abierta en MetaMask/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: /abrí metamask para conectar/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the truncated address and disconnects when already connected", async () => {
    const user = userEvent.setup();
    wagmiState.isConnected = true;
    wagmiState.address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    render(<ConnectWallet />);

    expect(screen.getByText(/0x94880b/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /disconnect/i }));
    expect(disconnect).toHaveBeenCalled();
  });

  it("shows connecting state while detection or connect is pending", () => {
    wagmiState.isPending = true;
    render(<ConnectWallet />);

    expect(
      screen.getByRole("button", { name: /connecting/i }),
    ).toBeDisabled();
  });
});
