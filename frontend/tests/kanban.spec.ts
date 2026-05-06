import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();
}

test("redirects to login when unauthenticated", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("login with wrong credentials shows error", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/invalid username or password/i)).toBeVisible();
});

test("login and see the board", async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page);
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("logout returns to login screen", async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page);
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("adds a card and it persists after reload", async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Persistent card");
  await firstColumn.getByPlaceholder("Details").fill("Should survive reload.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Persistent card").first()).toBeVisible();

  await page.reload();
  await expect(page.locator('[data-testid^="column-"]').first().getByText("Persistent card").first()).toBeVisible();
});

test("AI sidebar creates a card via chat", async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page);

  await page.getByRole("button", { name: /open ai chat/i }).click();
  const input = page.getByPlaceholder("Ask the AI...");
  await input.fill('Add a card called "AI created task" to the Backlog column');
  await page.getByRole("button", { name: /send/i }).click();

  const backlog = page.getByTestId("column-col-backlog");
  await expect(backlog.getByText("AI created task").first()).toBeVisible({ timeout: 15000 });
});

test("moves a card between columns", async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page);

  const backlog = page.getByTestId("column-col-backlog");
  await backlog.getByRole("button", { name: /add a card/i }).click();
  await backlog.getByPlaceholder("Card title").fill("Drag me");
  await backlog.getByRole("button", { name: /add card/i }).click();
  await expect(backlog.getByText("Drag me")).toBeVisible();

  const card = backlog.getByText("Drag me");
  const targetColumn = page.getByTestId("column-col-done");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) throw new Error("Unable to resolve drag coordinates.");

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + 120, { steps: 12 });
  await page.mouse.up();
  await expect(targetColumn.getByText("Drag me").first()).toBeVisible();
});
