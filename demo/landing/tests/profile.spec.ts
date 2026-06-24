import { test, expect } from "@playwright/test";

// ✅ Strong: asserts that the SAVED values reflect the user's input.
test("updates the profile and persists the new name and email", async ({ page }) => {
  await page.goto("/profile");
  await page.getByLabel("Full name").fill("Bob Builder");
  await page.getByLabel("Email").fill("bob@verdict.bank");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("saved-name")).toHaveText("Bob Builder");
  await expect(page.getByTestId("saved-email")).toHaveText("bob@verdict.bank");
});

// 🛑 Bad: weak .toBeTruthy() on a string that's always truthy.
test("renders profile page", async ({ page }) => {
  await page.goto("/profile");
  const heading = await page.locator("h1").textContent();
  expect(heading).toBeTruthy();
});
