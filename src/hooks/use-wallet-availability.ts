"use client";

import { useEffect, useState } from "react";
import {
  resolveWalletAvailability,
  startEip6963Discovery,
  type WalletAvailability,
} from "@/lib/metamask";

export function useWalletAvailability() {
  // Always start as "detecting" so SSR HTML matches the first client render.
  // Reading window.ethereum during useState init caused a hydration mismatch.
  const [availability, setAvailability] = useState<WalletAvailability>(
    "detecting",
  );

  useEffect(() => {
    let cancelled = false;

    void resolveWalletAvailability().then((result) => {
      if (!cancelled) setAvailability(result);
    });

    const cleanup = startEip6963Discovery(() => {
      if (!cancelled) setAvailability("installed");
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return availability;
}
