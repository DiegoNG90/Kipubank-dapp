import { describe, expect, it } from "vitest";
import { providerHint } from "@/lib/wallet-ui";

describe("providerHint", () => {
  it("translates the missing provider error", () => {
    expect(providerHint("Provider not found")).toBe(
      "No se encontró un provider. Recargá la página con MetaMask desbloqueada.",
    );
  });

  it("passes through other messages unchanged", () => {
    expect(providerHint("User rejected the request.")).toBe(
      "User rejected the request.",
    );
  });

  it("returns undefined when no message exists", () => {
    expect(providerHint(undefined)).toBeUndefined();
  });
});
