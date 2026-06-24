import { test, expect } from "@playwright/test";

// ✅ Strong: asserts on the actual logged-in identity AND the visible session marker.
test("logs in successfully and shows the logged-in identity", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("alice@verdict.bank");
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("logged-in-as")).toContainText("alice@verdict.bank");
});

// 🛑 Bad: only checks something appeared. The login button could be missing entirely.
test("loads the login page", async ({ page }) => {
  await page.goto("/login");
  const form = await page.locator("form").count();
  expect(form).toBeTruthy();
});

// 🛑 Bad: broad selectors (.rounded and div match many elements on the page).
test("submits the login form", async ({ page }) => {
  await page.goto("/login");
  await page.locator(".rounded").first().click();
  await expect(page.locator(".rounded")).toBeVisible();
});
