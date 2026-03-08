import { expect, test, type Page } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

async function expectTableToScrollHorizontally(
  page: Page,
  route: string,
  tableName: string,
): Promise<void> {
  await page.goto(route, { waitUntil: "networkidle" });

  const scrollState = await page.getByRole("table", { name: tableName }).evaluate((table) => {
    const maybeScroller = table.parentElement;
    if (maybeScroller === null) {
      throw new Error("Expected table to have a scroll container parent");
    }

    maybeScroller.scrollLeft = 64;

    return {
      clientWidth: maybeScroller.clientWidth,
      scrollLeft: maybeScroller.scrollLeft,
      scrollWidth: maybeScroller.scrollWidth,
    };
  });

  expect(scrollState.scrollWidth).toBeGreaterThan(scrollState.clientWidth);
  expect(scrollState.scrollLeft).toBeGreaterThan(0);
}

test("dashboard table scrolls horizontally on mobile", async ({ page }) => {
  await expectTableToScrollHorizontally(page, "/", "Companies table");
});

test("playground comparison table scrolls horizontally on mobile", async ({ page }) => {
  await expectTableToScrollHorizontally(page, "/playground", "Comparison table");
});
