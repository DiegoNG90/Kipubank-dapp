import { sepolia } from "viem/chains";

export const SEPOLIA_CHAIN_ID = sepolia.id;

export const SEPOLIA_ROUTER =
  "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" as const;

export const SEPOLIA_WETH =
  "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as const;

export const SEPOLIA_USDC =
  "0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238" as const;

export const USDC_DECIMALS = 6;
export const ETH_DECIMALS = 18;

export const ETHERSCAN_TX_URL = "https://sepolia.etherscan.io/tx";

export function getKipuBankAddress(): `0x${string}` | undefined {
  const address = process.env.NEXT_PUBLIC_KIPUBANK_ADDRESS;
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return undefined;
  }
  return address as `0x${string}`;
}
