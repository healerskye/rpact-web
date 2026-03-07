import { test, expect, type Page } from "@playwright/test";

async function openApp(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

test.describe("Simulation", () => {
  test("runs simulation and shows power result", async ({ page }) => {
    await openApp(page);
    // Click first simulation tab (Means)
    await page.getByRole("button", { name: /simulation/i }).first().click();

    await page.locator("input[id='maxNumberOfIterations']").fill("100");
    await page.getByRole("button", { name: /simulate/i }).click();

    await expect(page.locator("table").first()).toBeVisible({ timeout: 60_000 });
  });
});
