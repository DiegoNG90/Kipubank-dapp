import { sepolia } from "viem/chains";

export const SEPOLIA_CHAIN_ID = sepolia.id;

export const SEPOLIA_ROUTER =
  "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" as const;

export const SEPOLIA_WETH =
  "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as const;

export const SEPOLIA_USDC =
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const;

/** Live Sepolia KipuBankV3. Do not use 0x078dEbfbFC8C2764c561Bd636D833Cc569FDb3B2. */
export const EXPECTED_KIPUBANK_ADDRESS =
  "0xd8473b57CAdEd25D7b41b4c451e74C1Bf92DD3ca" as const;

export const USDC_DECIMALS = 6;
export const ETH_DECIMALS = 18;

export const ETHERSCAN_TX_URL = "https://sepolia.etherscan.io/tx";

/** When deploy block is unset, scan at most this many blocks for history. */
export const HISTORY_BLOCK_WINDOW = 100_000n;

/** Max block range per eth_getLogs request (public RPC limits). */
export const HISTORY_LOG_CHUNK_SIZE = 5_000n;

/** Max entries rendered in the transaction history panel. */
export const MAX_HISTORY_ENTRIES = 50;

export function getKipuBankAddress(): `0x${string}` | undefined {
  const address = process.env.NEXT_PUBLIC_KIPUBANK_ADDRESS;
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return undefined;
  }
  return address as `0x${string}`;
}

export function isExpectedKipuBankAddress(
  address: `0x${string}` | undefined = getKipuBankAddress(),
): boolean {
  return (
    !!address &&
    address.toLowerCase() === EXPECTED_KIPUBANK_ADDRESS.toLowerCase()
  );
}

export function getKipuBankDeployBlock(): bigint | undefined {
  const raw = process.env.NEXT_PUBLIC_KIPUBANK_DEPLOY_BLOCK?.trim();
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  return BigInt(raw);
}

export function resolveHistoryFromBlock(
  currentBlock: bigint,
  deployBlock: bigint | undefined = getKipuBankDeployBlock(),
): bigint {
  if (deployBlock !== undefined && deployBlock <= currentBlock) {
    return deployBlock;
  }
  if (currentBlock > HISTORY_BLOCK_WINDOW) {
    return currentBlock - HISTORY_BLOCK_WINDOW;
  }
  return 0n;
}
