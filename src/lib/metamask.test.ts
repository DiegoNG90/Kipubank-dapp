import { afterEach, describe, expect, it } from "vitest";
import {
  canOpenWallet,
  discoverMetaMaskEip6963,
  isMetaMaskInstalled,
  METAMASK_DOWNLOAD_URL,
} from "@/lib/metamask";

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

describe("canOpenWallet", () => {
  afterEach(() => {
    delete (window as Window & { ethereum?: unknown }).ethereum;
  });

  it("returns true when any injected provider exists, including Brave", async () => {
    setEthereum({ isMetaMask: true, isBraveWallet: true });
    await expect(canOpenWallet()).resolves.toBe(true);
  });

  it("returns true when MetaMask announces via EIP-6963 without window.ethereum", async () => {
    const onRequest = () => {
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: { info: { rdns: "io.metamask" } },
        }),
      );
    };
    window.addEventListener("eip6963:requestProvider", onRequest);
    await expect(canOpenWallet()).resolves.toBe(true);
    window.removeEventListener("eip6963:requestProvider", onRequest);
  });

  it("returns false when nothing is injected", async () => {
    await expect(canOpenWallet()).resolves.toBe(false);
  });
});

describe("discoverMetaMaskEip6963", () => {
  it("returns false when no wallet announces", async () => {
    await expect(discoverMetaMaskEip6963(20)).resolves.toBe(false);
  });
});

describe("METAMASK_DOWNLOAD_URL", () => {
  it("points at the official Spanish download page without tracking params", () => {
    expect(METAMASK_DOWNLOAD_URL).toBe("https://metamask.io/es/download");
  });
});
