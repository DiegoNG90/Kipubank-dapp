import { afterEach, describe, expect, it } from "vitest";
import {
  canOpenWallet,
  discoverMetaMaskEip6963,
  getImmediateWalletAvailability,
  isMetaMaskInstalled,
  METAMASK_DOWNLOAD_URL,
  resolveWalletAvailability,
  startEip6963Discovery,
} from "@/lib/metamask";
import { clearEthereum, setEthereum } from "@/test/ethereum";

describe("isMetaMaskInstalled", () => {
  afterEach(() => {
    clearEthereum();
  });

  it("returns false when no injected provider exists", () => {
    clearEthereum();
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

describe("getImmediateWalletAvailability", () => {
  afterEach(() => {
    clearEthereum();
  });

  it("returns installed when a provider is injected", () => {
    setEthereum({ isMetaMask: true });
    expect(getImmediateWalletAvailability()).toBe("installed");
  });

  it("returns detecting when nothing is injected yet", () => {
    clearEthereum();
    expect(getImmediateWalletAvailability()).toBe("detecting");
  });
});

describe("resolveWalletAvailability", () => {
  afterEach(() => {
    clearEthereum();
  });

  it("returns installed when any injected provider exists", async () => {
    setEthereum({ isMetaMask: true, isBraveWallet: true });
    await expect(resolveWalletAvailability()).resolves.toBe("installed");
  });

  it("returns installed when MetaMask announces via EIP-6963", async () => {
    const onRequest = () => {
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: { info: { rdns: "io.metamask" } },
        }),
      );
    };
    window.addEventListener("eip6963:requestProvider", onRequest);
    await expect(resolveWalletAvailability(50)).resolves.toBe("installed");
    window.removeEventListener("eip6963:requestProvider", onRequest);
  });

  it("returns not-installed when nothing is injected", async () => {
    await expect(resolveWalletAvailability(20)).resolves.toBe("not-installed");
  });
});

describe("startEip6963Discovery", () => {
  it("notifies when MetaMask announces after mount", () => {
    let found = false;
    const cleanup = startEip6963Discovery(() => {
      found = true;
    });

    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: { info: { rdns: "io.metamask" } },
      }),
    );

    expect(found).toBe(true);
    cleanup();
  });
});

describe("canOpenWallet", () => {
  afterEach(() => {
    clearEthereum();
  });

  it("returns true when any injected provider exists, including Brave", async () => {
    setEthereum({ isMetaMask: true, isBraveWallet: true });
    await expect(canOpenWallet()).resolves.toBe(true);
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
