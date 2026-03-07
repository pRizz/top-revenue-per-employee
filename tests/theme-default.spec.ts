import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectDarkSurface(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();

  const backgroundColor = await locator.evaluate((element) => {
    return window.getComputedStyle(element).backgroundColor;
  });

  expect(backgroundColor).not.toBe("rgb(255, 255, 255)");
}

async function expectDarkModeDefault(page: Page): Promise<void> {
  const isDarkRoot = await page.evaluate(() => {
    return document.documentElement.classList.contains("dark");
  });

  expect(isDarkRoot).toBe(true);

  await expectDarkSurface(page.locator("body"));
  await expectDarkSurface(page.locator("header"));
}

test("defaults dashboard to dark mode even for light system preference", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Top companies by revenue per employee" })).toBeVisible();
  await expectDarkModeDefault(page);
  await expectDarkSurface(page.locator("article").first());
});

test("keeps playground controls on dark surfaces by default", async ({ page }) => {
  await page.goto("/playground", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Comparison playground" })).toBeVisible();
  await expectDarkModeDefault(page);
  await expectDarkSurface(page.locator("section").first());
});
