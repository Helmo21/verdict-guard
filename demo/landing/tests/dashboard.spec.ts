import { test, expect } from "@playwright/test";

// ✅ Strong: asserts on specific balance value AND specific transaction count.
test("displays current balance and recent transactions", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("balance")).toHaveText("€1234.56");
  await expect(page.getByTestId("transactions-count")).toContainText("(4)");
  await expect(page.getByTestId("tx-tx-001")).toContainText("Café Olympia");
});

// 🛑 Bad: only checks visibility. The balance could be wrong; the table could be empty.
test("shows dashboard widgets", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("balance")).toBeVisible();
  await expect(page.getByTestId("transactions")).toBeVisible();
});

// 🛑 Bad: broad selectors (.rounded matches every card on the page; #balance is too generic).
test("renders transaction list", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator(".rounded")).toBeVisible();
  await expect(page.locator("#balance")).toBeVisible();
});
