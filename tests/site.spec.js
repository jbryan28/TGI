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

const prepareFullPageCapture = async (page) => {
  await page.evaluate(async () => {
    const step = Math.max(500, Math.floor(window.innerHeight * 0.75));
    for (let position = 0; position < document.body.scrollHeight; position += step) {
      window.scrollTo(0, position);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
    document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
    const captureStyle = document.createElement("style");
    captureStyle.textContent = ".site-header{position:absolute!important;top:0!important}.skip-link{display:none!important}";
    document.head.appendChild(captureStyle);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.waitForTimeout(200);
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
  await expect(page.locator(".resource-card")).toHaveCount(5);
  await expect(page.locator('a[href="cdza/"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="glossary/"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="newsletter/"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="membership/"]')).not.toHaveCount(0);

  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("homepage-full.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("Intelligence Briefing loads the configured Beehiiv form and attribution", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.route("https://subscribe-forms.beehiiv.com/v3/loader.js", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `const source = document.currentScript;
        const frame = document.createElement("iframe");
        frame.title = "TGI Intelligence Briefing subscription form";
        frame.dataset.beehiivForm = source.dataset.beehiivForm;
        source.insertAdjacentElement("afterend", frame);`,
    });
  });
  await page.route("https://subscribe-forms.beehiiv.com/attribution.js", async (route) => {
    await route.fulfill({ contentType: "application/javascript", body: "window.beehiivAttributionLoaded = true;" });
  });
  await page.goto("/newsletter/");
  await expect(page).toHaveTitle(/TGI Intelligence Briefing/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Enter the Trading Week");
  await expect(page.locator("[data-briefing-desk]")).toHaveCount(3);

  await page.locator('[data-briefing-desk="1"]').click();
  await expect(page.locator("#desk-title")).toHaveText("Define where capital earns permission.");
  await expect(page.locator("#desk-points li")).toHaveCount(3);

  await expect(page.locator('#beehiiv-embed-host script[data-beehiiv-form="11ce4844-7014-4245-ae48-50f9805170b0"]')).toHaveCount(1);
  await expect(page.locator('#beehiiv-embed-host iframe[data-beehiiv-form="11ce4844-7014-4245-ae48-50f9805170b0"]')).toHaveCount(1);
  await expect(page.locator("#newsletter-preview-form")).toBeHidden();
  await expect(page.locator('script[data-newsletter-attribution="beehiiv"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.beehiivAttributionLoaded)).toBe(true);

  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("newsletter.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator('[data-briefing-desk="2"]').click();
  await expect(page.locator("#desk-title")).toHaveText("Know when participation is unauthorized.");
  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("newsletter-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("newsletter welcome route completes the conversion path", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto("/newsletter/welcome/");
  await expect(page).toHaveTitle(/Welcome to the Briefing/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You are inside the briefing.");
  await expect(page.locator(".welcome-next article")).toHaveCount(3);
  await expect(page.locator('a[href="../../weekly-capital-review/"]')).not.toHaveCount(0);
  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("newsletter-welcome.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("membership separates curriculum, operating desk, and certification", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto("/membership/");
  await expect(page).toHaveTitle(/Trader Growth Institute Membership/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Think Like Capital");
  await expect(page.locator(".offer-architecture-grid > *")).toHaveCount(3);
  await expect(page.locator("[data-membership-layer]")).toHaveCount(3);
  await expect(page.locator("[data-program-phase]")).toHaveCount(7);

  await page.locator('[data-membership-layer="1"]').click();
  await expect(page.locator("#layer-title")).toHaveText("Apply the doctrine to current markets.");
  await expect(page.locator("#layer-points li")).toHaveCount(3);

  await page.locator('[data-program-phase="6"]').click();
  await expect(page.locator("#phase-title")).toHaveText("Capital Operator framework");
  await expect(page.locator("#phase-outcomes li")).toHaveCount(3);
  await expect(page.locator("#enrollment button")).toBeDisabled();
  await expect(page.locator("#enrollment")).toContainText("Verification required");

  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("membership.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator('[data-membership-layer="2"]').click();
  await expect(page.locator("#layer-title")).toHaveText("Convert decisions into evidence.");
  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("membership-mobile.png"), fullPage: true });
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
  await page.screenshot({ path: testInfo.outputPath("mobile-navigation.png") });
  await toggle.click();
  await prepareFullPageCapture(page);
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
  await prepareFullPageCapture(page);
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
    await expect(page.locator("footer nav a")).toHaveCount(6);
  }

  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("risk-disclosure.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("glossary search and discipline filters work", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto("/glossary/");
  await expect(page).toHaveTitle(/Trading Glossary/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Trading Glossary");
  await expect(page.locator(".glossary-term")).toHaveCount(46);

  await page.locator("#glossary-search").fill("Daily Zone Command");
  await expect(page.locator("#daily-zone-command")).toBeVisible();
  await expect(page.locator("#accumulation")).toBeHidden();

  await page.locator("#glossary-clear").click();
  await page.locator('[data-glossary-filter="risk"]').click();
  await expect(page.locator("#glossary-result-count")).toHaveText("Showing 7 of 46 terms");
  await expect(page.locator("#risk-mandate")).toBeVisible();
  await expect(page.locator("#weekly-bias")).toBeHidden();

  await page.locator('[data-glossary-filter="all"]').click();
  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("glossary.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator('[data-glossary-filter="framework"]').click();
  await expect(page.locator("#glossary-result-count")).toHaveText("Showing 8 of 46 terms");
  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("glossary-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("CDZA standard presents the chapter doctrine and interactive sequence", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto("/cdza/");
  await expect(page).toHaveTitle(/CDZA Execution Standard/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Verifiable Competence");
  await expect(page.locator("[data-certification-domain]")).toHaveCount(4);
  await expect(page.locator(".scorecard article")).toHaveCount(5);
  await expect(page.locator(".reset-track span")).toHaveCount(20);

  await page.locator('[data-certification-domain="3"]').click();
  await expect(page.locator("#domain-title")).toHaveText("Authorization");
  await expect(page.locator("#domain-current")).toHaveText("A");
  await expect(page.locator('a[href="journal/"]')).not.toHaveCount(0);

  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("cdza-standard.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator('[data-certification-domain="1"]').click();
  await expect(page.locator("#domain-title")).toHaveText("Displacement");
  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("cdza-standard-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("CDZA journal saves and restores the certification record", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto("/cdza/journal/");
  await expect(page).toHaveTitle(/CDZA Certification Journal/);
  await page.locator('[name="candidate_name"]').fill("Certification Candidate");
  await page.locator('[name="trade_01_instrument"]').fill("DXY");
  await page.locator('[name="trade_01_grade"]').selectOption("A");
  await page.locator('[name="trade_01_verified"]').check();
  await page.waitForTimeout(450);
  await page.reload();

  await expect(page.locator('[name="candidate_name"]')).toHaveValue("Certification Candidate");
  await expect(page.locator('[name="trade_01_instrument"]')).toHaveValue("DXY");
  await expect(page.locator('[name="trade_01_grade"]')).toHaveValue("A");
  await expect(page.locator('[name="trade_01_verified"]')).toBeChecked();
  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("cdza-journal.png"), fullPage: true });
  expect(errors).toEqual([]);
});
