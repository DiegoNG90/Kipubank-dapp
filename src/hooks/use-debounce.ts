"use client";

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

import { BPS_BASE } from "@/lib/bigint";

export function calculateMinOut(
  estimatedOut: bigint,
  slippageBps: bigint,
): bigint {
  const minPercentage = BPS_BASE - slippageBps;
  return (estimatedOut * minPercentage) / BPS_BASE;
}
