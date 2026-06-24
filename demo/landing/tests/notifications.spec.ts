import { test, expect } from "@playwright/test";

// ✅ Strong: error notification PLUS verification that no state change occurred.
test("shows error notification on invalid login and does not log in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("alice@verdict.bank");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("login-error")).toHaveText("Invalid email or password");
  await expect(page.getByTestId("logged-in-as")).toHaveCount(0);
});

// 🛑 Bad: pure toast-only. The transfer could have done nothing.
test("displays success notification", async ({ page }) => {
  await page.goto("/transfer");
  await page.getByLabel("Amount").fill("50");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Transfer successful toast")).toBeVisible();
});
