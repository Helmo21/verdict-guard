import { test, expect } from "@playwright/test";

// ✅ Strong: full happy path with value assertions on actual data.
test("creates a transfer and shows the new balance", async ({ page }) => {
  await page.goto("/transfer");
  await page.getByLabel("Amount").fill("100");
  await page.getByLabel("Beneficiary").selectOption("acct-42");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByTestId("balance")).toHaveText("€900.00");
  await expect(page.getByTestId("last-transfer-amount")).toHaveText("€100.00");
  await expect(page.getByTestId("last-transfer-beneficiary")).toHaveText("acct-42");
});

// 🛑 Bad: only checks the success toast appeared. The balance could be unchanged.
test("shows success toast after transfer", async ({ page }) => {
  await page.goto("/transfer");
  await page.getByLabel("Amount").fill("100");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Transfer successful toast")).toBeVisible();
});

// 🛑 Bad: arbitrary sleep masks timing bugs.
test("waits for transfer to complete", async ({ page }) => {
  await page.goto("/transfer");
  await page.getByLabel("Amount").fill("50");
  await page.getByRole("button", { name: "Send" }).click();
  await page.waitForTimeout(3000);
  await expect(page.getByTestId("balance")).toHaveText("€950.00");
});

// ✅ Strong: negative case asserts the rejection message AND that balance is unchanged.
test("rejects a transfer above the daily limit with the correct error", async ({ page }) => {
  await page.goto("/transfer");
  await page.getByLabel("Amount").fill("99999999");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("alert")).toHaveText("Daily transfer limit exceeded");
  await expect(page.getByTestId("balance")).toHaveText("€1000.00");
});
