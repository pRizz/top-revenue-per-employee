import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const screenshotDirectory = path.resolve("docs/demo-screenshots");

const disableMotionCss = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
`;

const capturePageScreenshot = async (
  page: Page,
  route: string,
  filename: string,
  expectedHeading: string,
): Promise<void> => {
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.getByRole("link", { name: "Top Revenue per Employee" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
  await expect(page.getByRole("heading", { name: expectedHeading })).toBeVisible();
  await page.addStyleTag({ content: disableMotionCss });
  await page.screenshot({
    path: path.join(screenshotDirectory, filename),
    fullPage: true,
  });
};

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await mkdir(screenshotDirectory, { recursive: true });
});

test("captures dashboard demo screenshot", async ({ page }) => {
  await capturePageScreenshot(
    page,
    "/",
    "dashboard.png",
    "Top companies by revenue per employee",
  );
});

test("captures playground demo screenshot", async ({ page }) => {
  await capturePageScreenshot(
    page,
    "/playground",
    "playground.png",
    "Comparison playground",
  );
});
