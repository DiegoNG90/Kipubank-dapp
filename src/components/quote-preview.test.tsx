import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuotePreview } from "@/components/quote-preview";
import { SEPOLIA_USDC, SEPOLIA_WETH } from "@/lib/constants";
import { describeQuote } from "@/lib/quote";

describe("QuotePreview", () => {
  it("shows loading state", () => {
    render(<QuotePreview isLoading />);
    expect(screen.getByText(/Fetching quote/i)).toBeInTheDocument();
  });

  it("renders quote details", () => {
    const quote = describeQuote({
      amountIn: 1_000_000_000_000_000_000n,
      decimalsIn: 18,
      symbolIn: "ETH",
      estimatedOut: 2_500_000n,
      slippageBps: 50n,
      path: [SEPOLIA_WETH, SEPOLIA_USDC],
      symbolsByAddress: { [SEPOLIA_USDC.toLowerCase()]: "USDC" },
      treatFirstAsEth: true,
    });

    render(<QuotePreview quote={quote} />);

    expect(screen.getByText(/ETH → WETH → USDC/)).toBeInTheDocument();
    expect(screen.getByText(/Minimum you receive/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.50%/)).toBeInTheDocument();
  });

  it("shows warnings when present", () => {
    const quote = describeQuote({
      amountIn: 100n,
      decimalsIn: 6,
      symbolIn: "USDC",
      slippageBps: 50n,
      path: [SEPOLIA_USDC],
      symbolsByAddress: { [SEPOLIA_USDC.toLowerCase()]: "USDC" },
    });

    render(<QuotePreview quote={quote} />);
    expect(screen.getByText(/liquidity/i)).toBeInTheDocument();
  });
});
