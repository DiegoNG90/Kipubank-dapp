"use client";

import { useEffect, useState } from "react";
import {
  getImmediateWalletAvailability,
  resolveWalletAvailability,
  startEip6963Discovery,
  type WalletAvailability,
} from "@/lib/metamask";

export function useWalletAvailability() {
  const [availability, setAvailability] = useState<WalletAvailability>(() =>
    getImmediateWalletAvailability(),
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
