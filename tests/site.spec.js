import { test, expect } from "@playwright/test";

const captureErrors = (page) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => errors.push(`request: ${request.url()} ${request.failure()?.errorText}`));
  return errors;
};

test("homepage interactions remain functional", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/Trader Growth Institute/);

  await page.locator('[data-hero-market="NAS100"]').click();
  await expect(page.locator("#hero-symbol")).toHaveText("NAS100");
  await expect(page.locator("#hero-status-regime")).toHaveText("Expansion");

  await page.locator('[data-stage="2"]').click();
  await expect(page.locator("#stage-title")).toHaveText("Authorize Execution");

  await page.locator('[data-instrument="USDJPY"]').click();
  await expect(page.locator("#briefing-price")).toHaveText("159.640");

  await page.locator("#cycle-scrubber").evaluate((element) => {
    element.value = "92";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#cycle-tooltip span")).toHaveText("Capital Completion");

  await page.locator("#case-slider").evaluate((element) => {
    element.value = "72";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#case-comparison")).toHaveAttribute("style", /72%/);

  await page.locator(".founder-story summary").click();
  await expect(page.locator(".founder-story")).toHaveAttribute("open", "");

  await page.screenshot({ path: testInfo.outputPath("homepage-full.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("mobile navigation and responsive controls work", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.locator(".nav-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#site-nav")).toHaveClass(/is-open/);
  await page.screenshot({ path: testInfo.outputPath("homepage-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("Weekly Capital Review saves locally and restores", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto("/weekly-capital-review/");
  await page.locator("#market-regime").selectOption({ label: "Expansion" });
  await page.getByLabel("Bullish").check();
  await page.locator("#lessons-learned").fill("Wait for authorized displacement before committing capital.");
  await page.waitForTimeout(500);
  await page.reload();

  await expect(page.locator("#market-regime")).toHaveValue("Expansion");
  await expect(page.getByLabel("Bullish")).toBeChecked();
  await expect(page.locator("#lessons-learned")).toHaveValue("Wait for authorized displacement before committing capital.");
  await page.screenshot({ path: testInfo.outputPath("weekly-capital-review.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("legal routes are reachable and linked", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  const routes = [
    ["/privacy/", "Privacy Policy"],
    ["/terms/", "Terms of Use"],
    ["/risk-disclosure/", "Risk Disclosure"],
  ];

  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.locator("footer nav a")).toHaveCount(3);
  }

  await page.screenshot({ path: testInfo.outputPath("risk-disclosure.png"), fullPage: true });
  expect(errors).toEqual([]);
});
