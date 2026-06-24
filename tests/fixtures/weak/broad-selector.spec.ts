import { test, expect } from "@playwright/test";

test("submits the form", async ({ page }) => {
  await page.goto("/transfer");
  await page.locator("text=Send").click();
  await expect(page.locator(".success")).toHaveText("Done");
});
