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

const expectStylesApplied = async (page) => {
  await expect(page.locator('link[rel="stylesheet"][href$="styles.css"]')).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe("rgb(8, 10, 10)");
};

test("homepage interactions remain functional", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto("/");
  await expectStylesApplied(page);
  await expect(page).toHaveTitle(/TGI Intelligence Briefing/);

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
  await expect(page.locator(".resource-card")).toHaveCount(7);
  await expect(page.locator('a[href="cot/"]')).not.toHaveCount(0);
  await expect(page.locator('#site-nav a[href="dzc/"]')).toHaveText("Book");
  await expect(page.locator('a[href="dzc/"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="cdza/"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="glossary/"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="newsletter/"]')).not.toHaveCount(0);
  await expect(page.locator('#site-nav a[href="desk/"]')).toHaveText("Operating Desk");

  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("homepage-full.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("COT dashboard loads official data and updates market views", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto("/cot/");
  await expectStylesApplied(page);
  await expect(page).toHaveTitle(/COT Positioning Dashboard/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("See Where Capital");
  await expect(page.locator("#cot-market option")).toHaveCount(15);
  await expect(page.locator("#hero-report-date")).not.toHaveText("—");
  await expect(page.locator("#cot-table-body tr")).toHaveCount(52);
  await expect(page.locator("#cot-long-ranking li")).toHaveCount(5);
  await expect(page.locator("#cot-short-ranking li")).toHaveCount(5);

  await page.locator("#cot-market").selectOption("GOLD");
  await expect(page.locator("#cot-actor")).toHaveValue("managedMoney");
  await expect(page.locator("#cot-chart-symbol")).toContainText("GOLD");
  await page.locator("#cot-actor").selectOption("producers");
  await expect(page.locator("#cot-chart-symbol")).toContainText("Producers / Merchants");

  await page.locator('[data-cot-range="13"]').click();
  await expect(page.locator("#cot-table-body tr")).toHaveCount(13);
  await expect(page.locator("#cot-line")).not.toHaveAttribute("d", "");

  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("cot-dashboard.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator("#cot-market option")).toHaveCount(15);
  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("cot-dashboard-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("separate Macro Desk connects to the headline feed and preserves source links", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  let feedRequests = 0;
  await page.route("**/macro/data/headlines.json**", async (route) => {
    feedRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        generatedAt: new Date().toISOString(),
        sources: [{ name: "Test source", ok: true, articleCount: 2 }],
        articles: [
          { title: "Central bank keeps policy rate unchanged", url: "https://example.com/policy-update", domain: "Federal Reserve", seendate: "2026-09-27T16:00:00Z", sourceType: "official" },
          { title: "Oil prices move after supply data", url: "https://markets.example.org/energy", domain: "markets.example.org", seendate: "2026-09-27T15:15:00Z", sourceType: "aggregator" },
        ],
      }),
    });
  });
  await page.goto("/macro/");
  await expectStylesApplied(page);
  await expect(page).toHaveTitle(/Macro Desk/);
  await expect(page.getByText("LIVE HEADLINE STREAM", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Read the forces");
  await expect(page.getByRole("link", { name: /BEA schedule/ })).toHaveAttribute("href", "https://www.bea.gov/news/schedule");
  await expect(page.getByRole("link", { name: /ISM/ })).toHaveAttribute("href", "https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/");
  await expect(page.getByRole("link", { name: /BLS schedule/ })).toHaveAttribute("href", "https://www.bls.gov/schedule/news_release/");
  await expect(page.getByRole("heading", { name: "Central bank keeps policy rate unchanged" })).toBeVisible();
  await expect(page.locator("#macro-headlines article")).toHaveCount(2);
  await expect(page.locator("#macro-feed-status")).toHaveAttribute("data-state", "live");
  await expect(page.getByRole("link", { name: "Central bank keeps policy rate unchanged" })).toHaveAttribute("href", "https://example.com/policy-update");
  await expect(page.getByText(/not a licensed real-time terminal/)).toBeVisible();
  await expect(page.locator('a[href="../newsletter/"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="../cot/"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="../membership/"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Check for updates" }).click();
  await expect.poll(() => feedRequests).toBe(2);

  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("macro-desk-preview.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByText("LIVE HEADLINE STREAM", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const headerBox = await page.locator(".site-header").boundingBox();
  const bannerBox = await page.locator(".macro-preview-banner").boundingBox();
  expect(headerBox).not.toBeNull();
  expect(bannerBox).not.toBeNull();
  expect(bannerBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
  await page.locator(".nav-toggle").click();
  await expect(page.locator("#site-nav")).toBeVisible();
  await expect(page.locator("#site-nav a")).toHaveCount(4);
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
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Read the forces behind price");
  await expect(page.locator('.newsletter-device-stage img')).toHaveAttribute("src", "../assets/tgi-newsletter-devices.svg");
  await expect(page.locator("[data-briefing-desk]")).toHaveCount(3);
  await expect(page.locator(".newsletter-founder-image img")).toHaveAttribute("src", "../assets/jay-bryan-newsletter.webp");
  await expect(page.locator('[data-newsletter-cta="founder"]')).toHaveAttribute("href", "#subscribe");

  await page.locator('[data-briefing-desk="1"]').click();
  await expect(page.locator("#desk-title")).toHaveText("Define where capital earns permission.");
  await expect(page.locator("#desk-points li")).toHaveCount(3);

  await expect(page.locator('#beehiiv-embed-host script[data-beehiiv-form="ec5ec129-a4a4-45dc-b5a6-c9b520b51423"]')).toHaveCount(1);
  await expect(page.locator('#beehiiv-embed-host iframe[data-beehiiv-form="ec5ec129-a4a4-45dc-b5a6-c9b520b51423"]')).toHaveCount(1);
  await expect(page.locator("#newsletter-preview-form")).toBeHidden();
  await expect(page.locator('script[data-newsletter-attribution="beehiiv"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.beehiivAttributionLoaded)).toBe(true);

  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("newsletter.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const heroFormBox = await page.locator(".newsletter-hero-embed").boundingBox();
  const deviceStageBox = await page.locator(".newsletter-device-stage").boundingBox();
  expect(heroFormBox).not.toBeNull();
  expect(deviceStageBox).not.toBeNull();
  expect(heroFormBox.y).toBeLessThan(deviceStageBox.y);
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

test("Daily Zone Command presents the book without displacing the newsletter path", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto("/dzc/");
  await expectStylesApplied(page);
  await expect(page).toHaveTitle(/Daily Zone Command/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Daily Zone Command");
  await expect(page.locator('[data-amazon-cta="hero"]')).toHaveAttribute("href", "https://www.amazon.com/dp/B0HDRCR2JS");
  await expect(page.locator('[data-amazon-cta="final"]')).toHaveAttribute("href", "https://www.amazon.com/dp/B0HDRCR2JS");
  await expect(page.locator('.book-cover-crop img')).toHaveAttribute("src", "../assets/daily-zone-command-book-transparent.webp");
  await expect(page.locator('.book-page a[href="../newsletter/"]')).not.toHaveCount(0);
  await expect(page.locator('.book-author-image img')).toHaveAttribute("src", "../assets/jay-bryan-dzc-author.webp");
  await expect(page.locator("body")).not.toContainText(/Series 7|Series 66|7 & 66/);
  await expect(page.locator(".book-doctrine-card")).toHaveCount(4);
  await expect(page.locator(".book-sequence li")).toHaveCount(5);

  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("dzc.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await prepareFullPageCapture(page);
  await page.screenshot({ path: testInfo.outputPath("dzc-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("legacy book URL redirects to the canonical DZC route", async ({ page }) => {
  await page.goto("/daily-zone-command/");
  await page.waitForURL(/\/dzc\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Daily Zone Command");
});

test("Operating Desk offer has visible checkout, accurate scope and clear cancellation", async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:375,height:667}]) {
    await page.setViewportSize(viewport);
    await page.goto("/desk/");
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(8, 10, 10)");
    await expect(page).toHaveTitle(/TGI Operating Desk Membership/);
    const join = page.locator(".desk-hero .desk-join");
    await expect(join).toHaveAttribute("href", "https://tradergrowthfx.thinkific.com/enroll/3775153?price_id=4732368");
    const box = await join.boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await expect(page.locator(".desk-grid article")).toHaveCount(6);
    await expect(page.locator(".desk-lead")).toContainText("across 43 instruments");
    const gif = page.locator('[data-desk-gif]');
    await gif.scrollIntoViewIfNeeded();
    await expect(gif).toHaveAttribute("src", "../assets/tgi-operating-desk-tour.gif?v=20261011-order");
    await expect.poll(() => gif.evaluate(image => image.complete && image.naturalWidth === 960), { timeout: 15000 }).toBe(true);
    await expect(page.locator(".desk-preview")).toHaveCSS("border-top-width", "0px");
    await page.getByRole("button", { name: "Stop animation", exact: true }).click();
    await expect(gif).toHaveAttribute("src", "../assets/tgi-operating-desk-tour-poster.webp?v=20261011-order");
    await page.getByRole("button", { name: "Play animation", exact: true }).click();
    await expect(gif).toHaveAttribute("src", "../assets/tgi-operating-desk-tour.gif?v=20261011-order");
    const animationControl = page.getByRole("button", { name: "Stop animation", exact: true });
    await animationControl.focus();
    await animationControl.press("Enter");
    await expect(gif).toHaveAttribute("src", "../assets/tgi-operating-desk-tour-poster.webp?v=20261011-order");
    await expect(page.locator(".desk-preview a, .desk-preview details, .desk-preview figcaption, .desk-preview video")).toHaveCount(0);
    await page.locator("[data-desk-gif-control]").evaluate(control => control.blur());
    await page.locator(".desk-preview").screenshot({ path: testInfo.outputPath(`desk-gif-${viewport.width}.png`) });
    await expect(page.locator(".desk-market-groups li")).toHaveText([
      /33.*Forex pairs/,
      /4.*Indices.*DXY.*NAS100.*US30.*SPX/,
      /4.*Commodities.*Gold.*Silver.*WTI.*Brent/,
      /2.*Cryptocurrencies.*Bitcoin.*XRP/,
    ]);
    await expect(page.locator(".desk-coverage-note")).toContainText("not every instrument receives a fresh review each day");
    await page.getByText("How often is the Desk updated?", {exact:true}).click();
    await expect(page.locator(".desk-faq details[open]")).toContainText("Weekly news announcements");
    await expect(page.locator(".desk-faq details[open]")).toContainText("does not guarantee a new review of all 43 instruments every day");
    await page.getByText("How often is the Desk updated?", {exact:true}).click();
    await page.getByText("Can I cancel anytime?", {exact:true}).click();
    await expect(page.locator(".desk-faq details[open]")).toContainText("stop future monthly charges");
    await expect(page.locator(".desk-disclaimer")).toContainText("No profitability");
    await expect(page.locator(".desk-disclaimer")).toContainText("not included");
    await page.locator("header .brand").click();
    await page.waitForURL(/\/$/);
  }
  expect(errors).toEqual([]);
});

test("Operating Desk stays readable with reduced motion or JavaScript disabled", async ({ browser }, testInfo) => {
  for (const profile of [
    { name: "reduced-motion", options: { reducedMotion: "reduce" } },
    { name: "no-javascript", options: { javaScriptEnabled: false } },
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      ...profile.options,
    });
    try {
      const page = await context.newPage();
      const errors = captureErrors(page);
      await page.goto("http://127.0.0.1:4173/desk/");
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toBeVisible();
      await expect(heading).toHaveCSS("opacity", "1");
      await expect(heading).toHaveCSS("transform", "none");
      await expect(page.locator(".desk-hero .desk-join")).toBeVisible();
      await expect(page.locator(".desk-offer")).toContainText("$99");
      await expect(page.locator("[data-desk-gif]")).toHaveAttribute("src", "../assets/tgi-operating-desk-tour-poster.webp?v=20261011-order");
      const card = page.locator(".desk-grid article").first();
      await card.scrollIntoViewIfNeeded();
      await expect(card).toHaveCSS("opacity", "1");
      await expect(card).toHaveCSS("transform", "none");
      const pricing = page.locator(".desk-pricing aside");
      await pricing.scrollIntoViewIfNeeded();
      await expect(pricing).toHaveCSS("opacity", "1");
      await expect(pricing.locator(".desk-join")).toBeVisible();
      if (profile.name === "no-javascript") {
        await expect(page.locator("[data-desk-gif-control]")).toBeHidden();
      }
      // Keep capture preparation synchronous: page timers do not run with JavaScript disabled.
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        const header = document.querySelector(".site-header");
        header.style.position = "absolute";
        header.style.top = "0";
        document.querySelector(".skip-link").style.display = "none";
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
      await page.screenshot({ path: testInfo.outputPath(`desk-${profile.name}.png`), fullPage: true });
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test("legacy member route opens the Operating Desk", async ({ page }) => {
  await page.goto("/member/");
  await page.waitForURL(/\/desk\/$/);
  await expect(page).toHaveTitle(/TGI Operating Desk/);
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

  await page.goto("/terms/");
  await page.evaluate(() => window.scrollTo(0, Math.floor(document.body.scrollHeight * 0.55)));
  await expect(page.locator("[data-header]")).toHaveClass(/is-scrolled/);
  const scrolledToggle = page.locator(".nav-toggle");
  await scrolledToggle.click();
  await expect(page.locator("body > #site-nav")).toHaveClass(/is-open/);
  await page.waitForTimeout(400);
  const menuGeometry = await page.locator("#site-nav").evaluate((menu) => {
    const rect = menu.getBoundingClientRect();
    const links = [...menu.querySelectorAll("a")].map((link) => {
      const linkRect = link.getBoundingClientRect();
      return { top: linkRect.top, bottom: linkRect.bottom };
    });
    return {
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight,
      background: getComputedStyle(menu).backgroundColor,
      links,
    };
  });
  expect(menuGeometry.top).toBeLessThanOrEqual(1);
  expect(menuGeometry.bottom).toBeGreaterThanOrEqual(menuGeometry.viewportHeight - 1);
  expect(menuGeometry.background).toBe("rgb(8, 10, 10)");
  expect(menuGeometry.links.every(({ top, bottom }) => top >= 0 && bottom <= menuGeometry.viewportHeight)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile-navigation-scrolled.png") });
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
