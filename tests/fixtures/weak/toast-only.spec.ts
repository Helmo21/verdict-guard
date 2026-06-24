import { test, expect } from "@playwright/test";

test("creates a transfer", async ({ page }) => {
  await page.goto("/transfer");
  await page.getByLabel("Amount").fill("100");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Transfer successful toast")).toBeVisible();
});
