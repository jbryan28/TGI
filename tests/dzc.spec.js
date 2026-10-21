import { test, expect } from "@playwright/test";

test("DZC sibling homepage preserves charts and controls with its own responsive identity", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dzc-preview/");
    await expect(page).toHaveTitle("Daily Zone Command™ | Daily Zones with Jay Bryan");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://dailyzonecommand.com/");
    const brand = page.locator(".site-header .brand");
    await expect(brand).toHaveAccessibleName("Daily Zone Command home");
    await expect(brand.locator(".dzc-wordmark")).toBeVisible();
    await expect(brand.locator("img")).toHaveJSProperty("complete", true);
    expect(await brand.locator("img").evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator("h1")).toContainText("Start with Daily Zones.");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:testInfo.outputPath(`dzc-home-${width}.png`), animations:"disabled"});
  }
  await page.getByRole("button", {name:"Open navigation"}).click();
  await expect(page.locator("#site-nav")).toBeVisible();
  await page.locator('#site-nav a[href="#daily-zones"]').click();
  await expect(page.locator("#site-nav")).not.toBeVisible();
  await page.locator("#stage-next").click();
  await expect(page.locator("#stage-title")).toHaveText("Mark Daily Zones");
  await page.locator('[data-hero-market="USDJPY"]').click();
  await expect(page.locator("#hero-timeframe")).toHaveText("Daily");
  await expect(page.locator("#desk-membership")).toContainText("DZC course");
  await expect(page.locator("#desk-membership")).toContainText("$99/month");
  await expect(page.locator("#founder-story")).toBeVisible();
  await expect(page.locator(".resource-card")).toHaveCount(8);
  expect(errors).toEqual([]);
});

test("DZC book, membership and mentoring load directly and preserve external transactions", async ({ page }, testInfo) => {
  for (const route of ["desk", "dzc", "mentor", "mentor/confirmed", "newsletter"]) {
    await page.goto(`/dzc-preview/${route}/`);
    await page.reload();
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /dzc-mark\.svg$/);
    await expect(page.locator("header .dzc-mark")).toBeVisible();
    await expect(page.locator("header .dzc-wordmark")).toBeVisible();
    const logo = page.locator("header .dzc-mark img");
    await expect(logo).toHaveJSProperty("complete", true);
    expect(await logo.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({width,height:900});
    await page.goto("/dzc-preview/desk/");
    await expect(page.getByRole("heading", {level:1})).toContainText("Daily Zones");
    await expect(page.locator('a[href="https://tradergrowthfx.thinkific.com/enroll/3775153?price_id=4732368"]').first()).toBeVisible();
    await page.screenshot({path:testInfo.outputPath(`dzc-membership-${width}.png`),animations:"disabled"});
  }
  await page.goto("/dzc-preview/mentor/");
  await expect(page.getByRole("link", {name:/Book with Jay/})).toHaveAttribute("href", "https://calendly.com/dailyzonecommand/mentorship");
});
