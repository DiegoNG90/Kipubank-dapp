import { describe, expect, it } from "vitest";
import {
  classifyConnectError,
  providerHint,
  shouldOpenWalletGuide,
} from "@/lib/wallet-ui";

describe("classifyConnectError", () => {
  it("classifies user rejection", () => {
    const result = classifyConnectError(new Error("User rejected the request."));
    expect(result.kind).toBe("userRejected");
    expect(result.message).toMatch(/rechazaste/i);
  });

  it("classifies pending wallet requests", () => {
    const result = classifyConnectError({
      code: -32002,
      message: "Request of type eth_requestAccounts already pending",
    });
    expect(result.kind).toBe("pending");
    expect(result.message).toMatch(/solicitud abierta/i);
  });

  it("classifies missing provider as locked guidance", () => {
    const result = classifyConnectError(new Error("Provider not found"));
    expect(result.kind).toBe("locked");
    expect(result.message).toMatch(/abrí la extensión/i);
  });

  it("passes through unknown errors as generic", () => {
    const result = classifyConnectError(new Error("RPC timeout"));
    expect(result.kind).toBe("generic");
    expect(result.message).toBe("RPC timeout");
  });
});

describe("providerHint", () => {
  it("translates the missing provider error", () => {
    expect(providerHint("Provider not found")).toMatch(/abrí la extensión/i);
  });

  it("returns undefined when no message exists", () => {
    expect(providerHint(undefined)).toBeUndefined();
  });
});

describe("shouldOpenWalletGuide", () => {
  it("opens the guide for provider-not-found style errors", () => {
    expect(shouldOpenWalletGuide(new Error("Provider not found"))).toBe(true);
  });

  it("does not open the guide for pending requests", () => {
    expect(
      shouldOpenWalletGuide({ code: -32002, message: "already pending" }),
    ).toBe(false);
  });
});
