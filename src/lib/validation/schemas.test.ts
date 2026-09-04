import { describe, expect, it } from "vitest";
import {
  ethereumAddressSchema,
  makeAmountSchema,
  parseAndValidateAmount,
  validateTokenAddress,
} from "@/lib/validation/schemas";

describe("ethereumAddressSchema", () => {
  it("accepts a valid checksummed address", () => {
    const result = ethereumAddressSchema.safeParse(
      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238");
    }
  });

  it("rejects an invalid address", () => {
    const result = ethereumAddressSchema.safeParse("0x123");
    expect(result.success).toBe(false);
  });

  it("rejects empty input", () => {
    const result = ethereumAddressSchema.safeParse("   ");
    expect(result.success).toBe(false);
  });
});

describe("makeAmountSchema", () => {
  const schema = makeAmountSchema({ decimals: 6 });

  it("parses a valid amount", () => {
    expect(schema.safeParse("10.5").success).toBe(true);
    expect(schema.parse("10.5")).toBe(10_500_000n);
  });

  it("rejects zero", () => {
    expect(schema.safeParse("0").success).toBe(false);
  });

  it("rejects negative values", () => {
    expect(schema.safeParse("-1").success).toBe(false);
  });

  it("rejects too many decimal places", () => {
    const result = schema.safeParse("1.1234567");
    expect(result.success).toBe(false);
  });

  it("rejects scientific notation", () => {
    expect(schema.safeParse("1e3").success).toBe(false);
  });

  it("enforces a max bound", () => {
    const capped = makeAmountSchema({ decimals: 6, max: 5_000_000n });
    expect(capped.safeParse("10").success).toBe(false);
    expect(capped.safeParse("4.5").success).toBe(true);
  });
});

describe("validateTokenAddress", () => {
  it("returns ok for valid addresses", () => {
    const result = validateTokenAddress(
      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    );
    expect(result.ok).toBe(true);
  });

  it("returns error for invalid addresses", () => {
    const result = validateTokenAddress("not-an-address");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/invalid/i);
    }
  });
});

describe("parseAndValidateAmount", () => {
  it("returns parsed bigint on success", () => {
    const result = parseAndValidateAmount("100", 6);
    expect(result).toEqual({ ok: true, value: 100_000_000n });
  });

  it("returns error message on failure", () => {
    const result = parseAndValidateAmount("", 6);
    expect(result.ok).toBe(false);
  });
});
