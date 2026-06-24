import { test, expect } from "@playwright/test";

test("creates a transfer and shows the new balance", async ({ page }) => {
  await page.goto("/transfer");
  await page.getByLabel("Amount").fill("100");
  await page.getByLabel("Beneficiary").selectOption("acct-42");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByTestId("balance")).toHaveText("€900.00");
  await expect(page.getByTestId("last-transfer-amount")).toHaveText("€100.00");
  await expect(page.getByTestId("last-transfer-beneficiary")).toHaveText("acct-42");
});

test("rejects a transfer above the daily limit with the correct error", async ({ page }) => {
  await page.goto("/transfer");
  await page.getByLabel("Amount").fill("99999999");
  await page.getByLabel("Beneficiary").selectOption("acct-42");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByRole("alert")).toHaveText("Daily transfer limit exceeded");
  await expect(page.getByTestId("balance")).toHaveText("€1,000.00");
});
