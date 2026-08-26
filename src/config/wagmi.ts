import { createConfig, fallback, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { sepolia } from "viem/chains";

const envRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL?.trim();

const sepoliaRpcs = [
  ...(envRpc ? [envRpc] : []),
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
];

export const wagmiConfig = createConfig({
  chains: [sepolia],
  // Do not use injected({ target: "metaMask" }): it throws "Provider not found"
  // when EIP-6963 / another wallet overwrites the named target.
  connectors: [injected()],
  transports: {
    [sepolia.id]: fallback(sepoliaRpcs.map((url) => http(url))),
  },
  ssr: true,
});
