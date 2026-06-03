import { test, expect } from "@playwright/test";

test.describe("Rydex Landing Page Smoke Tests", () => {
  test("should load the landing page and display logo", async ({ page }) => {
    await page.goto("/");

    // Verify main logo or header text is visible
    const branding = page.getByAltText("RYDEX");
    await expect(branding.first()).toBeVisible();
  });

  test("should open the authentication modal when clicking Log In", async ({ page }) => {
    await page.goto("/");

    // Find and click the Log In button in Nav bar
    const loginButton = page.locator("button:has-text('Login')").first();
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Verify that the Auth Modal opens by asserting Google auth option is displayed
    const googleLoginButton = page.locator("text=Continue With Google");
    await expect(googleLoginButton).toBeVisible();

    // Verify step fields (Email, Password fields should be visible)
    const emailInput = page.locator("input[placeholder='Email']");
    await expect(emailInput).toBeVisible();
  });
});
