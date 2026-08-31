import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectWallet } from "@/components/connect-wallet";
import { METAMASK_DOWNLOAD_URL } from "@/lib/metamask";

const connect = vi.fn();
const disconnect = vi.fn();

const wagmiState = {
  address: undefined as `0x${string}` | undefined,
  isConnected: false,
  isPending: false,
  error: null as Error | null,
};

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

function setEthereum(value: unknown) {
  Object.defineProperty(window, "ethereum", {
    value,
    writable: true,
    configurable: true,
  });
}

describe("ConnectWallet", () => {
  beforeEach(() => {
    connect.mockReset();
    disconnect.mockReset();
    wagmiState.address = undefined;
    wagmiState.isConnected = false;
    wagmiState.isPending = false;
    wagmiState.error = null;
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

  it("connects when a wallet is injected even if it is not flagged as MetaMask", async () => {
    const user = userEvent.setup();
    setEthereum({ isMetaMask: true, isBraveWallet: true });
    render(<ConnectWallet />);

    await user.click(screen.getByRole("button", { name: /connect metamask/i }));

    await waitFor(() => {
      expect(connect).toHaveBeenCalled();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
});
