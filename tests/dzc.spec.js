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
  await expect(page.locator("#founder-title")).toHaveText("Why Jay started DZC");
  await expect(page.locator("#founder-story")).toContainText("Jay created Daily Zone Command™ to explain his Daily Zones approach");
  await expect(page.locator(".resource-card")).toHaveCount(8);
  expect(errors).toEqual([]);
});

test("DZC mobile page stays aligned while its sliders and vertical navigation work", async ({ browser, browserName }, testInfo) => {
  test.setTimeout(60000);
  for (const width of [320, 393, 430]) {
    const context = await browser.newContext({
      viewport: { width, height: 852 },
      screen: { width, height: 852 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: browserName !== "firefox",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto("/dzc-preview/");
      const aligned = async () => page.evaluate(() => ({
        x: window.scrollX,
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
        sectionsFit: [...document.querySelectorAll("main > section")].every(section => {
          const box = section.getBoundingClientRect();
          return box.left >= -1 && box.right <= innerWidth + 1;
        }),
      }));
      const swipe = async selector => {
        const target = page.locator(selector);
        await target.dispatchEvent("pointerdown", { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 250, clientY: 300 });
        await target.dispatchEvent("pointerup", { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 130, clientY: 300 });
      };
      for (const section of ["#daily-zones", "#member-chart-review", "#founder", "#resources"]) {
        await page.locator(section).scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy({ left: 240, top: 0, behavior: "instant" }));
        const layout = await aligned();
        expect(layout.x).toBe(0);
        expect(layout.width).toBeLessThanOrEqual(layout.viewport);
        expect(layout.sectionsFit).toBe(true);
      }
      await swipe("#stage-panel");
      await expect(page.locator("#stage-current")).toHaveText("02");
      const strip = page.locator(".stage-tabs");
      await strip.evaluate(el => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
      expect(await strip.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
      await swipe("#hero-chart-panel");
      await expect(page.locator("#hero-symbol")).toHaveText("NAS100");
      await page.locator("#resources-next").click();
      await expect(page.locator("#resources-count")).toHaveText("02 / 08");
      expect((await aligned()).x).toBe(0);

      await page.locator("#founder-title").scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(100);
      const header = await page.locator(".site-header").evaluate(el => {
        const brand = el.querySelector(".brand").getBoundingClientRect();
        const toggle = el.querySelector(".nav-toggle").getBoundingClientRect();
        return { left: brand.left, brandRight: brand.right, toggleLeft: toggle.left, right: toggle.right, viewport: innerWidth };
      });
      expect(header.left).toBeGreaterThanOrEqual(0);
      expect(header.brandRight).toBeLessThanOrEqual(header.toggleLeft);
      expect(header.right).toBeLessThanOrEqual(header.viewport);
      await page.screenshot({ path: testInfo.outputPath(`dzc-founder-mobile-${width}.png`), animations: "disabled" });
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.locator("#site-nav")).toBeVisible();
      await page.locator('#site-nav a[href="#daily-zones"]').click();
      await expect(page.locator("#framework-title")).toBeInViewport();
      await expect(page.locator("#site-nav")).not.toBeVisible();
      expect((await aligned()).x).toBe(0);
    } finally {
      await context.close();
    }
  }
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
