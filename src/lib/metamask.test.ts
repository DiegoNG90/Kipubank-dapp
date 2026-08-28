import { afterEach, describe, expect, it } from "vitest";
import { isMetaMaskInstalled, METAMASK_DOWNLOAD_URL } from "@/lib/metamask";

function setEthereum(value: unknown) {
  Object.defineProperty(window, "ethereum", {
    value,
    writable: true,
    configurable: true,
  });
}

describe("isMetaMaskInstalled", () => {
  afterEach(() => {
    delete (window as Window & { ethereum?: unknown }).ethereum;
  });

  it("returns false when no injected provider exists", () => {
    delete (window as Window & { ethereum?: unknown }).ethereum;
    expect(isMetaMaskInstalled()).toBe(false);
  });

  it("returns true when window.ethereum is MetaMask", () => {
    setEthereum({ isMetaMask: true });
    expect(isMetaMaskInstalled()).toBe(true);
  });

  it("returns false for Brave pretending to be MetaMask", () => {
    setEthereum({ isMetaMask: true, isBraveWallet: true });
    expect(isMetaMaskInstalled()).toBe(false);
  });

  it("returns true when MetaMask is one of several injected providers", () => {
    setEthereum({
      isMetaMask: false,
      providers: [{ isMetaMask: false }, { isMetaMask: true }],
    });
    expect(isMetaMaskInstalled()).toBe(true);
  });
});

describe("METAMASK_DOWNLOAD_URL", () => {
  it("points at the official Spanish download page without tracking params", () => {
    expect(METAMASK_DOWNLOAD_URL).toBe("https://metamask.io/es/download");
  });
});
