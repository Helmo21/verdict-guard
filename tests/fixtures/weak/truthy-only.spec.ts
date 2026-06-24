import { test, expect } from "@playwright/test";

test("loads the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  const balance = await page.getByTestId("balance").textContent();
  expect(balance).toBeTruthy();
});
