import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EXPECTED_KIPUBANK_ADDRESS,
  getKipuBankAddress,
  getKipuBankDeployBlock,
  HISTORY_BLOCK_WINDOW,
  isExpectedKipuBankAddress,
  resolveHistoryFromBlock,
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

describe("history block helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the deploy block from env", () => {
    vi.stubEnv("NEXT_PUBLIC_KIPUBANK_DEPLOY_BLOCK", "1234567");
    expect(getKipuBankDeployBlock()).toBe(1234567n);
  });

  it("falls back to a recent window when deploy block is unset", () => {
    vi.unstubAllEnvs();
    expect(resolveHistoryFromBlock(200_000n)).toBe(200_000n - HISTORY_BLOCK_WINDOW);
  });

  it("uses the configured deploy block when present", () => {
    vi.stubEnv("NEXT_PUBLIC_KIPUBANK_DEPLOY_BLOCK", "150000");
    expect(resolveHistoryFromBlock(200_000n)).toBe(150_000n);
  });
});
