import { afterEach, describe, expect, it, vi } from "vitest";
import { getKipuBankAddress } from "@/lib/constants";

describe("getKipuBankAddress", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined when the env var is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_KIPUBANK_ADDRESS", "");
    expect(getKipuBankAddress()).toBeUndefined();
  });

  it("returns undefined for an invalid address", () => {
    vi.stubEnv("NEXT_PUBLIC_KIPUBANK_ADDRESS", "not-an-address");
    expect(getKipuBankAddress()).toBeUndefined();
  });

  it("returns a checksummed-ready address for a valid env value", () => {
    const address = "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4";
    vi.stubEnv("NEXT_PUBLIC_KIPUBANK_ADDRESS", address);
    expect(getKipuBankAddress()).toBe(address);
  });
});
