export const METAMASK_DOWNLOAD_URL = "https://metamask.io/es/download";

type InjectedEthereum = {
  isMetaMask?: boolean;
  isBraveWallet?: boolean;
  providers?: InjectedEthereum[];
};

function isMetaMaskProvider(provider: InjectedEthereum | undefined) {
  if (!provider) return false;
  // Brave can advertise isMetaMask; exclude it so we don't skip the install modal.
  return Boolean(provider.isMetaMask) && !provider.isBraveWallet;
}

export function isMetaMaskInstalled(): boolean {
  if (typeof window === "undefined") return false;

  const ethereum = window.ethereum as InjectedEthereum | undefined;
  if (!ethereum) return false;

  if (isMetaMaskProvider(ethereum)) return true;
  return ethereum.providers?.some(isMetaMaskProvider) ?? false;
}
