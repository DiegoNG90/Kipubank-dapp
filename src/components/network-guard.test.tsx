import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkGuard } from "@/components/network-guard";
import { SEPOLIA_CHAIN_ID } from "@/lib/constants";

const switchChain = vi.fn();

const wagmiState = {
  isConnected: false,
  chainId: SEPOLIA_CHAIN_ID,
  isPending: false,
};

vi.mock("wagmi", () => ({
  useAccount: () => ({
    isConnected: wagmiState.isConnected,
    chainId: wagmiState.chainId,
  }),
  useSwitchChain: () => ({
    switchChain,
    isPending: wagmiState.isPending,
  }),
}));

describe("NetworkGuard", () => {
  beforeEach(() => {
    switchChain.mockReset();
    wagmiState.isConnected = false;
    wagmiState.chainId = SEPOLIA_CHAIN_ID;
    wagmiState.isPending = false;
  });

  it("renders children when the wallet is disconnected", () => {
    render(
      <NetworkGuard>
        <p>Console content</p>
      </NetworkGuard>,
    );

    expect(screen.getByText("Console content")).toBeInTheDocument();
    expect(screen.queryByText("Wrong network")).not.toBeInTheDocument();
  });

  it("warns and hides bank actions on the wrong chain", () => {
    wagmiState.isConnected = true;
    wagmiState.chainId = 1;

    render(
      <NetworkGuard>
        <p>Console content</p>
      </NetworkGuard>,
    );

    expect(screen.getByText("Wrong network")).toBeInTheDocument();
    expect(screen.getByText(/You are on chain 1/i)).toBeInTheDocument();
    expect(screen.queryByText("Console content")).not.toBeInTheDocument();
  });

  it("requests a switch to Sepolia from the warning banner", async () => {
    const user = userEvent.setup();
    wagmiState.isConnected = true;
    wagmiState.chainId = 1;

    render(
      <NetworkGuard>
        <p>Console content</p>
      </NetworkGuard>,
    );

    await user.click(screen.getByRole("button", { name: /switch to sepolia/i }));
    expect(switchChain).toHaveBeenCalledWith({ chainId: SEPOLIA_CHAIN_ID });
  });

  it("passes through on Sepolia without a warning", () => {
    wagmiState.isConnected = true;
    wagmiState.chainId = SEPOLIA_CHAIN_ID;

    render(
      <NetworkGuard>
        <p>Console content</p>
      </NetworkGuard>,
    );

    expect(screen.queryByText("Wrong network")).not.toBeInTheDocument();
    expect(screen.getByText("Console content")).toBeInTheDocument();
  });
});
