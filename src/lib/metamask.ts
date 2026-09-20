export const METAMASK_DOWNLOAD_URL = "https://metamask.io/es/download";

const METAMASK_RDNS = new Set(["io.metamask", "io.metamask.flask"]);
const DEFAULT_DISCOVERY_TIMEOUT_MS = 500;

export type WalletAvailability = "installed" | "not-installed" | "detecting";

type InjectedEthereum = {
  isMetaMask?: boolean;
  isBraveWallet?: boolean;
  providers?: InjectedEthereum[];
};

type Eip6963AnnounceDetail = {
  info?: { rdns?: string };
};

function isMetaMaskProvider(provider: InjectedEthereum | undefined) {
  if (!provider) return false;
  return Boolean(provider.isMetaMask) && !provider.isBraveWallet;
}

export function isMetaMaskInstalled(): boolean {
  if (typeof window === "undefined") return false;

  const ethereum = window.ethereum as InjectedEthereum | undefined;
  if (!ethereum) return false;

  if (isMetaMaskProvider(ethereum)) return true;
  return ethereum.providers?.some(isMetaMaskProvider) ?? false;
}

export function hasInjectedProvider(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export function hasImmediateWalletProvider(): boolean {
  return isMetaMaskInstalled() || hasInjectedProvider();
}

export function getImmediateWalletAvailability(): WalletAvailability {
  if (typeof window === "undefined") return "detecting";
  if (hasImmediateWalletProvider()) return "installed";
  return "detecting";
}

export function discoverMetaMaskEip6963(timeoutMs = 200): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (found: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve(found);
    };

    const onAnnounce = (event: Event) => {
      const rdns = (event as CustomEvent<Eip6963AnnounceDetail>).detail?.info
        ?.rdns;
      if (rdns && METAMASK_RDNS.has(rdns)) finish(true);
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    window.setTimeout(() => finish(false), timeoutMs);
  });
}

/** Starts listening for EIP-6963 MetaMask announcements until cleanup is called. */
export function startEip6963Discovery(onMetaMaskFound: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onAnnounce = (event: Event) => {
    const rdns = (event as CustomEvent<Eip6963AnnounceDetail>).detail?.info
      ?.rdns;
    if (rdns && METAMASK_RDNS.has(rdns)) onMetaMaskFound();
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  return () => {
    window.removeEventListener("eip6963:announceProvider", onAnnounce);
  };
}

export async function resolveWalletAvailability(
  timeoutMs = DEFAULT_DISCOVERY_TIMEOUT_MS,
): Promise<Exclude<WalletAvailability, "detecting">> {
  if (hasImmediateWalletProvider()) return "installed";
  const discovered = await discoverMetaMaskEip6963(timeoutMs);
  return discovered ? "installed" : "not-installed";
}

/** True when a wallet popup can be opened (injected provider or EIP-6963 MetaMask). */
export async function canOpenWallet(): Promise<boolean> {
  return (await resolveWalletAvailability()) === "installed";
}
