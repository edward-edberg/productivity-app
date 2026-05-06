import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AISidebar } from "@/components/AISidebar";

const mockBoard = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: [] },
    { id: "col-discovery", title: "Discovery", cardIds: [] },
    { id: "col-progress", title: "In Progress", cardIds: [] },
    { id: "col-review", title: "Review", cardIds: [] },
    { id: "col-done", title: "Done", cardIds: [] },
  ],
  cards: {},
};

vi.mock("@/lib/chat", () => ({
  sendChat: vi.fn(),
}));

import { sendChat } from "@/lib/chat";
const mockSendChat = sendChat as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockSendChat.mockReset();
});

async function openChat() {
  await userEvent.click(screen.getByRole("button", { name: /open ai chat/i }));
}

describe("AISidebar", () => {
  it("renders the FAB toggle button", () => {
    render(<AISidebar onBoardUpdate={() => {}} />);
    expect(screen.getByRole("button", { name: /open ai chat/i })).toBeInTheDocument();
  });

  it("opens the panel and shows input on FAB click", async () => {
    render(<AISidebar onBoardUpdate={() => {}} />);
    await openChat();
    expect(screen.getByPlaceholderText(/ask the ai/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("shows placeholder text when no messages", async () => {
    render(<AISidebar onBoardUpdate={() => {}} />);
    await openChat();
    expect(screen.getByText(/add, move, or remove cards/i)).toBeInTheDocument();
  });

  it("sends a message and shows the response", async () => {
    mockSendChat.mockResolvedValue({
      response: "Got it!",
      board_update: null,
      board: mockBoard,
    });

    render(<AISidebar onBoardUpdate={() => {}} />);
    await openChat();
    await userEvent.type(screen.getByPlaceholderText(/ask the ai/i), "Hello");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("Got it!")).toBeInTheDocument());
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("shows thinking indicator while loading", async () => {
    let resolve: (v: unknown) => void;
    mockSendChat.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<AISidebar onBoardUpdate={() => {}} />);
    await openChat();
    await userEvent.type(screen.getByPlaceholderText(/ask the ai/i), "Hello");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /close ai chat/i })).toBeInTheDocument());

    resolve!({ response: "Done", board_update: null, board: mockBoard });
    await waitFor(() => expect(screen.getByText("Done")).toBeInTheDocument());
  });

  it("calls onBoardUpdate when board_update is present", async () => {
    const updatedBoard = { ...mockBoard, cards: { "card-1": { id: "card-1", title: "New", details: "" } } };
    mockSendChat.mockResolvedValue({
      response: "Added a card.",
      board_update: updatedBoard,
      board: updatedBoard,
    });

    const onBoardUpdate = vi.fn();
    render(<AISidebar onBoardUpdate={onBoardUpdate} />);
    await openChat();
    await userEvent.type(screen.getByPlaceholderText(/ask the ai/i), "Add a card");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(onBoardUpdate).toHaveBeenCalledWith(updatedBoard));
  });

  it("does not call onBoardUpdate when board_update is null", async () => {
    mockSendChat.mockResolvedValue({
      response: "No changes.",
      board_update: null,
      board: mockBoard,
    });

    const onBoardUpdate = vi.fn();
    render(<AISidebar onBoardUpdate={onBoardUpdate} />);
    await openChat();
    await userEvent.type(screen.getByPlaceholderText(/ask the ai/i), "What columns exist?");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("No changes.")).toBeInTheDocument());
    expect(onBoardUpdate).not.toHaveBeenCalled();
  });

  it("shows error message on failed request", async () => {
    mockSendChat.mockRejectedValue(new Error("Network error"));

    render(<AISidebar onBoardUpdate={() => {}} />);
    await openChat();
    await userEvent.type(screen.getByPlaceholderText(/ask the ai/i), "Hello");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() =>
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    );
  });
});
