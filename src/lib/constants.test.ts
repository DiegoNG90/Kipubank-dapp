import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EXPECTED_KIPUBANK_ADDRESS,
  getKipuBankAddress,
  isExpectedKipuBankAddress,
} from "@/lib/constants";

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

describe("isExpectedKipuBankAddress", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts the known Sepolia deployment", () => {
    vi.stubEnv("NEXT_PUBLIC_KIPUBANK_ADDRESS", EXPECTED_KIPUBANK_ADDRESS);
    expect(isExpectedKipuBankAddress()).toBe(true);
  });

  it("rejects a different configured address", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_KIPUBANK_ADDRESS",
      "0x94880bC1361cd7723E55eE9c7bCce319fa2F93e4",
    );
    expect(isExpectedKipuBankAddress()).toBe(false);
  });
});
