import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";

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

vi.mock("@/lib/api", () => ({
  fetchBoard: vi.fn(),
  apiRenameColumn: vi.fn().mockResolvedValue(undefined),
  apiCreateCard: vi.fn().mockImplementation((_colId: string, title: string, details: string) =>
    Promise.resolve({ id: "card-new", title, details })
  ),
  apiDeleteCard: vi.fn().mockResolvedValue(undefined),
  apiMoveCard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth", () => ({ logout: vi.fn() }));

vi.mock("@/components/AISidebar", () => ({
  AISidebar: () => <div data-testid="ai-sidebar-mock" />,
}));

import { fetchBoard } from "@/lib/api";
const mockFetchBoard = fetchBoard as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetchBoard.mockResolvedValue(structuredClone(mockBoard));
});

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  it("renders five columns after loading", async () => {
    render(<KanbanBoard onLogout={() => {}} />);
    await waitFor(() => expect(screen.getAllByTestId(/column-/i)).toHaveLength(5));
  });

  it("renames a column", async () => {
    render(<KanbanBoard onLogout={() => {}} />);
    await waitFor(() => screen.getAllByTestId(/column-/i));
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    render(<KanbanBoard onLogout={() => {}} />);
    await waitFor(() => screen.getAllByTestId(/column-/i));
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "New card");
    await userEvent.type(within(column).getByPlaceholderText(/details/i), "Notes");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));
    await waitFor(() => expect(within(column).getByText("New card")).toBeInTheDocument());

    await userEvent.click(within(column).getByRole("button", { name: /delete new card/i }));
    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });
});
