import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TxStatus } from "@/components/tx-status";
import { ETHERSCAN_TX_URL } from "@/lib/constants";

const hash =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as const;

describe("TxStatus", () => {
  it("renders nothing when there is no activity", () => {
    const { container } = render(<TxStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a destructive alert for errors", () => {
    render(<TxStatus error="Insufficient USDC balance for this withdrawal." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Transaction failed");
    expect(screen.getByText(/Insufficient USDC balance/i)).toBeInTheDocument();
  });

  it("shows pending copy while awaiting wallet confirmation", () => {
    render(<TxStatus isPending hash={hash} />);

    expect(screen.getByText("Awaiting wallet confirmation…")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view on etherscan/i })).toHaveAttribute(
      "href",
      `${ETHERSCAN_TX_URL}/${hash}`,
    );
  });

  it("shows confirming copy on-chain", () => {
    render(<TxStatus isConfirming hash={hash} />);

    expect(screen.getByText("Confirming on-chain…")).toBeInTheDocument();
  });

  it("shows success with an Etherscan link", () => {
    render(<TxStatus isSuccess hash={hash} />);

    expect(screen.getByText("Transaction confirmed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view on etherscan/i })).toHaveAttribute(
      "href",
      `${ETHERSCAN_TX_URL}/${hash}`,
    );
  });
});
