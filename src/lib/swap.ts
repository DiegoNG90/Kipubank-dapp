import { BPS_BASE } from "@/lib/bigint";

export function calculateMinOut(
  estimatedOut: bigint,
  slippageBps: bigint,
): bigint {
  const minPercentage = BPS_BASE - slippageBps;
  return (estimatedOut * minPercentage) / BPS_BASE;
}
