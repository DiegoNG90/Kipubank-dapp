import { ZERO } from "@/lib/bigint";
import { SEPOLIA_USDC, SEPOLIA_WETH } from "@/lib/constants";

export function isUsdcToken(
  tokenAddress: string,
  usdcFromContract?: `0x${string}`,
  canonicalUsdc: string = SEPOLIA_USDC,
): boolean {
  const normalized = tokenAddress.toLowerCase();
  return (
    normalized === canonicalUsdc.toLowerCase() ||
    Boolean(
      usdcFromContract && normalized === usdcFromContract.toLowerCase(),
    )
  );
}

export function needsTokenApproval(
  parsedAmount: bigint | undefined,
  allowance: bigint | undefined,
): boolean {
  return (
    parsedAmount !== undefined &&
    parsedAmount > ZERO &&
    (allowance === undefined || allowance < parsedAmount)
  );
}

export function buildTokenSwapPath(
  tokenAddress: `0x${string}`,
  usdcAddress: `0x${string}`,
): readonly [`0x${string}`, typeof SEPOLIA_WETH, `0x${string}`] {
  return [tokenAddress, SEPOLIA_WETH, usdcAddress];
}

export function buildEthSwapPath(
  usdcAddress: `0x${string}`,
): readonly [typeof SEPOLIA_WETH, `0x${string}`] {
  return [SEPOLIA_WETH, usdcAddress];
}
