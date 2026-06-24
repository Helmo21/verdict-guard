import { test, expect } from "@playwright/test";

test("waits for the page", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForTimeout(3000);
  await expect(page.getByTestId("balance")).toHaveText("€1,234.56");
});
