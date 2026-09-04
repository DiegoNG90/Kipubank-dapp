import { describe, expect, it } from "vitest";
import {
  canAdvanceFrom,
  canSubmitApprove,
  canSubmitDeposit,
  getNextStep,
  getPreviousStep,
  getStepperLabels,
  getVisibleSteps,
  isStepComplete,
  type DepositStepperContext,
} from "@/lib/deposit-stepper";

const baseCtx: DepositStepperContext = {
  needsApproval: false,
  isUsdc: true,
  hasLiquidity: true,
  wouldExceedCap: false,
  approveSimReady: false,
  depositSimReady: false,
  isPendingTx: false,
};

describe("getVisibleSteps", () => {
  it("includes approve when approval is required", () => {
    expect(getVisibleSteps(true)).toEqual([
      "token",
      "amount",
      "approve",
      "confirm",
      "success",
    ]);
  });

  it("skips approve when approval is not required", () => {
    expect(getVisibleSteps(false)).toEqual([
      "token",
      "amount",
      "confirm",
      "success",
    ]);
  });
});

describe("canAdvanceFrom", () => {
  it("blocks token step until address is valid", () => {
    expect(canAdvanceFrom("token", baseCtx)).toBe(false);
    expect(
      canAdvanceFrom("token", {
        ...baseCtx,
        tokenAddress: "0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238",
      }),
    ).toBe(true);
    expect(
      canAdvanceFrom("token", {
        ...baseCtx,
        tokenAddress: "0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238",
        tokenAddressError: "Invalid",
      }),
    ).toBe(false);
  });

  it("blocks amount step without liquidity or when over cap", () => {
    expect(
      canAdvanceFrom("amount", {
        ...baseCtx,
        parsedAmount: 100n,
        isUsdc: false,
        hasLiquidity: false,
      }),
    ).toBe(false);

    expect(
      canAdvanceFrom("amount", {
        ...baseCtx,
        parsedAmount: 100n,
        wouldExceedCap: true,
      }),
    ).toBe(false);

    expect(
      canAdvanceFrom("amount", {
        ...baseCtx,
        parsedAmount: 100n,
      }),
    ).toBe(true);
  });

  it("allows leaving approve only after allowance is sufficient", () => {
    expect(
      canAdvanceFrom("approve", { ...baseCtx, needsApproval: true }),
    ).toBe(false);
    expect(
      canAdvanceFrom("approve", { ...baseCtx, needsApproval: false }),
    ).toBe(true);
  });
});

describe("step navigation", () => {
  it("walks forward and backward through visible steps", () => {
    expect(getNextStep("token", false)).toBe("amount");
    expect(getNextStep("amount", false)).toBe("confirm");
    expect(getNextStep("confirm", false)).toBe("success");
    expect(getNextStep("success", false)).toBeNull();

    expect(getPreviousStep("confirm", false)).toBe("amount");
    expect(getPreviousStep("token", false)).toBeNull();
  });

  it("includes approve in navigation when needed", () => {
    expect(getNextStep("amount", true)).toBe("approve");
    expect(getNextStep("approve", true)).toBe("confirm");
  });
});

describe("isStepComplete", () => {
  it("marks earlier steps complete relative to current", () => {
    expect(isStepComplete("token", "confirm", false)).toBe(true);
    expect(isStepComplete("confirm", "confirm", false)).toBe(false);
  });
});

describe("submit guards", () => {
  it("requires simulation readiness for approve and deposit", () => {
    expect(
      canSubmitApprove({
        ...baseCtx,
        needsApproval: true,
        approveSimReady: true,
        parsedAmount: 1n,
      }),
    ).toBe(true);

    expect(
      canSubmitDeposit({
        ...baseCtx,
        depositSimReady: true,
        parsedAmount: 1n,
      }),
    ).toBe(true);

    expect(
      canSubmitDeposit({
        ...baseCtx,
        needsApproval: true,
        depositSimReady: true,
        parsedAmount: 1n,
      }),
    ).toBe(false);
  });
});

describe("getStepperLabels", () => {
  it("maps visible steps to labels", () => {
    expect(getStepperLabels(false).map((s) => s.label)).toEqual([
      "Token",
      "Amount",
      "Confirm",
      "Done",
    ]);
  });
});
