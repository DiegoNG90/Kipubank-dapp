import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "@/components/ui/modal";

describe("Modal", () => {
  it("does not render when closed", () => {
    render(
      <Modal open={false} title="Hidden" onClose={vi.fn()}>
        Body
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders title and children on document.body when open", () => {
    const { container } = render(
      <Modal open title="Install wallet" onClose={vi.fn()}>
        Download it first
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.getByRole("dialog", { name: "Install wallet" })).toBeInTheDocument();
    expect(document.body.contains(screen.getByRole("dialog"))).toBe(true);
    expect(screen.getByText("Download it first")).toBeInTheDocument();
  });

  it("closes on overlay click, close button, and Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open title="Install wallet" onClose={onClose}>
        Body
      </Modal>,
    );

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Cerrar diálogo" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
