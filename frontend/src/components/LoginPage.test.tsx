import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "@/components/LoginPage";

vi.mock("@/lib/auth", () => ({
  login: vi.fn(),
}));

import { login } from "@/lib/auth";
const mockLogin = login as ReturnType<typeof vi.fn>;

describe("LoginPage", () => {
  it("renders the sign in form", () => {
    render(<LoginPage onLogin={() => {}} />);
    expect(screen.getByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("calls onLogin on successful login", async () => {
    mockLogin.mockResolvedValue(true);
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);
    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(onLogin).toHaveBeenCalled();
  });

  it("shows error on failed login", async () => {
    mockLogin.mockResolvedValue(false);
    render(<LoginPage onLogin={() => {}} />);
    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
  });
});
