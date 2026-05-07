import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "@/components/LoginPage";

vi.mock("@/lib/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn(),
}));

import { login, getMe } from "@/lib/auth";
const mockLogin = login as ReturnType<typeof vi.fn>;
const mockGetMe = getMe as ReturnType<typeof vi.fn>;

const mockUser = { id: 1, username: "user", email: "" };

describe("LoginPage", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockGetMe.mockReset();
  });

  it("renders the sign in form", () => {
    render(<LoginPage onLogin={() => {}} />);
    expect(screen.getByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("calls onLogin on successful login", async () => {
    mockLogin.mockResolvedValue(true);
    mockGetMe.mockResolvedValue(mockUser);
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);
    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(onLogin).toHaveBeenCalledWith(mockUser);
  });

  it("shows error on failed login", async () => {
    mockLogin.mockResolvedValue(false);
    render(<LoginPage onLogin={() => {}} />);
    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
  });

  it("shows register form when toggled", async () => {
    render(<LoginPage onLogin={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /register/i }));
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});
