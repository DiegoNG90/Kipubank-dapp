import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Stepper } from "@/components/ui/stepper";

describe("Stepper", () => {
  const steps = [
    { id: "token", label: "Token" },
    { id: "amount", label: "Amount" },
    { id: "confirm", label: "Confirm" },
  ];

  it("marks the current step with aria-current", () => {
    render(<Stepper steps={steps} currentStepId="amount" />);
    expect(screen.getByText("Amount").previousElementSibling).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("shows checkmarks for completed steps", () => {
    render(<Stepper steps={steps} currentStepId="confirm" />);
    expect(screen.getByText("✓")).toBeInTheDocument();
  });
});
