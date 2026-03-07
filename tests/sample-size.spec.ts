import { test, expect, type Page } from "@playwright/test";

async function openApp(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

test.describe("Sample Size — Means", () => {
  test("displays results table after running calculation", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /means/i }).first().click();

    await page.locator("input[id='alpha']").fill("0.025");
    await page.locator("input[id='kMax']").fill("3");
    await page.locator("input[id='meanRatio']").fill("0.5");
    await page.locator("input[id='stDev']").fill("1");

    await page.getByRole("button", { name: /calculate/i }).click();

    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 30_000 });
  });

  test("shows error for invalid alpha", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /means/i }).first().click();
    await page.locator("input[id='alpha']").fill("1.5");
    await page.getByRole("button", { name: /calculate/i }).click();
    await expect(page.locator(".text-red-600").first()).toBeVisible({ timeout: 5_000 });
  });
});
