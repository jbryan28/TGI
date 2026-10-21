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
  await expect(page).toHaveTitle(/Daily Zones.*Trader Growth Institute/);

  await page.locator('[data-hero-market="NAS100"]').click();
  await expect(page.locator("#hero-symbol")).toHaveText("NAS100");
  await expect(page.locator("#hero-status-regime")).toHaveText("U.S. stock index");

  await page.locator('[data-stage="2"]').click();
  await expect(page.locator("#stage-title")).toHaveText("Watch how price reacts");

  await page.locator('[data-hero-market="USDJPY"]').click();
  await expect(page.locator("#hero-timeframe")).toHaveText("4H");
  await expect(page.locator(".briefing-dashboard")).toHaveCount(0);

  await page.locator("#cycle-scrubber").evaluate((element) => {
    element.value = "92";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#cycle-tooltip span")).toHaveText("Pullback");

  await expect(page.locator('.case-study, #case-slider')).toHaveCount(0);

  await expect(page.locator("#founder-story")).toBeVisible();
  await expect(page.locator("#founder details, #founder summary")).toHaveCount(0);
  await expect(page.locator(".resource-card")).toHaveCount(8);
  await expect(page.locator('a[href="cot/"]')).not.toHaveCount(0);
  await expect(page.locator('#site-nav a[href="dzc/"]')).toHaveText("Book");
  await expect(page.locator('a[href="dzc/"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="cdza/"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="glossary/"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="newsletter/"]')).not.toHaveCount(0);
  await expect(page.locator('#site-nav a[href="desk/"]')).toHaveText("Membership");

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
    await expect(page.getByRole("heading", {level:1})).toHaveText("Get Jay’s Daily Zones.");
    const join = page.locator(".desk-hero .desk-join");
    await expect(join).toHaveAttribute("href", "https://tradergrowthfx.thinkific.com/enroll/3775153?price_id=4732368");
    const box = await join.boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await expect(page.locator(".desk-bundle-note")).toContainText("Daily Zone Command™ PDF included");
    await expect(page.locator(".desk-offer")).toContainText("$99");
    await page.screenshot({ path: testInfo.outputPath(`desk-hero-${viewport.width}.png`) });
    const gif = page.locator('[data-desk-gif]');
    await gif.scrollIntoViewIfNeeded();
    await expect(gif).toHaveAttribute("src", "../assets/tgi-forex-portal-walkthrough.gif?v=20261011-positions");
    await expect.poll(() => gif.evaluate(image => image.complete && image.naturalWidth === 960 && image.naturalHeight === 660), { timeout: 15000 }).toBe(true);
    await expect(page.locator(".desk-preview")).toHaveCSS("border-top-width", "0px");
    await page.getByRole("button", { name: "Stop animation", exact: true }).click();
    await expect(gif).toHaveAttribute("src", "../assets/tgi-forex-portal-walkthrough-poster.webp?v=20261011-positions");
    await page.getByRole("button", { name: "Play animation", exact: true }).click();
    await expect(gif).toHaveAttribute("src", "../assets/tgi-forex-portal-walkthrough.gif?v=20261011-positions");
    const animationControl = page.getByRole("button", { name: "Stop animation", exact: true });
    await animationControl.focus();
    await animationControl.press("Enter");
    await expect(gif).toHaveAttribute("src", "../assets/tgi-forex-portal-walkthrough-poster.webp?v=20261011-positions");
    await expect(page.locator(".desk-preview a, .desk-preview details, .desk-preview figcaption, .desk-preview video")).toHaveCount(0);
    await page.locator("[data-desk-gif-control]").evaluate(control => control.blur());
    await page.locator(".desk-preview").screenshot({ path: testInfo.outputPath(`desk-gif-${viewport.width}.png`) });
    await expect(page.locator(".desk-market-groups li")).toHaveText([
      /33.*Forex pairs/,
      /4.*Indices.*DXY.*NAS100.*US30.*SPX/,
      /4.*Commodities.*Gold.*Silver.*WTI.*Brent/,
      /2.*Cryptocurrencies.*Bitcoin.*XRP/,
    ]);
    await expect(page.locator(".desk-coverage-note")).toContainText("not every market gets a new review each day");
    await page.getByText("How often is the Desk updated?", {exact:true}).click();
    await expect(page.locator(".desk-faq details[open]")).toContainText("Weekly market news");
    await expect(page.locator(".desk-faq details[open]")).toContainText("Not every market gets a new review each day");
    await page.getByText("How often is the Desk updated?", {exact:true}).click();
    await page.getByText("Is the Daily Zone Command™ book included?", {exact:true}).click();
    await expect(page.locator(".desk-faq details[open]")).toContainText("The PDF edition is included");
    await expect(page.locator(".desk-faq details[open]")).toContainText("one-to-one mentoring are separate purchases");
    await page.getByText("Is the Daily Zone Command™ book included?", {exact:true}).click();
    await page.getByText("Can I cancel anytime?", {exact:true}).click();
    await expect(page.locator(".desk-faq details[open]")).toContainText("stop future monthly charges");
    await expect(page.locator(".desk-disclaimer")).toContainText("No profitability");
    await expect(page.locator(".desk-disclaimer")).toContainText("not included");
    await expect(page.locator(".desk-pricing aside li")).toContainText(["Jay’s published Daily Zones", "Chart commentary and market scenarios", "Daily Zone Command™ PDF", "Weekly news and selected trade reviews", "43 market pages and the historical archive"]);
    await expect(page.locator(".desk-book-art img")).toHaveAttribute("src", "../assets/daily-zone-command-book-transparent.webp");
    await prepareFullPageCapture(page);
    await page.locator("#inside").screenshot({ path: testInfo.outputPath(`desk-included-${viewport.width}.png`) });
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
      await expect(page.locator("[data-desk-gif]")).toHaveAttribute("src", "../assets/tgi-forex-portal-walkthrough-poster.webp?v=20261011-positions");
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

test("homepage introduces Daily Zones clearly on desktop and mobile", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  for (const size of [{width:1440,height:900},{width:390,height:844},{width:375,height:667},{width:320,height:844}]) {
    await page.setViewportSize(size);await page.goto('/');await page.reload();
    await expect(page.getByRole('heading',{level:1})).toHaveText(/Understand the chart\.\s*Start with Daily Zones\./);
    await expect(page.locator('.hero-summary')).toContainText('Daily Zones mark areas on the daily chart');
    const start=page.locator('.hero-actions .button');await expect(start).toHaveAttribute('href','newsletter/');
    const box=await start.boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(size.height);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.locator('.hero-summary').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    await expect(page.locator('.home-zone-key dt')).toHaveText(['Daily Zones','Candles','Snapshot price']);
    await expect(page.locator('.hero-market')).toContainText('Historical snapshot · Not live data');
    await page.screenshot({path:testInfo.outputPath(`daily-zones-home-${size.width}.png`)});
    await page.locator('.hero-market').screenshot({path:testInfo.outputPath(`daily-zones-chart-${size.width}.png`)});
    await page.locator('[data-hero-market="GOLD"]').click();
    await expect(page.locator('#hero-chart-image')).toHaveAttribute('src', 'assets/member-charts/gold-2026-10-18.webp');
    await expect(page.locator('#hero-chart-caption')).toContainText('18 October 2026');
    await page.locator('.hero-actions .text-link').click();
    await expect(page).toHaveURL(/#daily-zones$/);
    await expect(page.locator('#framework-title')).toBeInViewport();
    await expect(page.locator('#framework-title')).toHaveText('What are Daily Zones?');
    await expect(page.locator('#framework-title')).toHaveCSS('color', 'rgb(245, 242, 233)');
    await expect(page.locator('.method-lead')).toHaveText('Here’s the Daily Zone Command™ method.');
    await expect(page.locator('.method-lead')).toHaveCSS('color', 'rgb(224, 180, 89)');
    const typeSizes = await page.locator('#daily-zones').evaluate(section => ({
      heading: parseFloat(getComputedStyle(section.querySelector('h2')).fontSize),
      subtext: parseFloat(getComputedStyle(section.querySelector('.method-lead')).fontSize),
    }));
    expect(typeSizes.heading).toBeGreaterThan(typeSizes.subtext * 1.4);
    await expect(page.locator('#framework')).toHaveText('From a marked zone to a trading plan.');
    await expect(page.locator('#daily-zones [data-stage]')).toHaveCount(5);
    await expect(page.locator('.authority, .principle-card, [data-principle]')).toHaveCount(0);
    await expect(page.locator('.operating-system')).toHaveCount(1);
    const flow = await page.locator('main > section[id]').evaluateAll(sections => sections.slice(0, 5).map(section => section.id));
    expect(flow).toEqual(['top', 'daily-zones', 'member-chart-review', 'desk-membership', 'founder']);
    const reviewFollowsMethod = await page.locator('#daily-zones').evaluate(section => section.getBoundingClientRect().bottom <= document.querySelector('#member-chart-review').getBoundingClientRect().top + 1);
    expect(reviewFollowsMethod).toBe(true);
    if (size.width <= 390) {
      const gaps = await page.evaluate(() => {
        const box = selector => document.querySelector(selector).getBoundingClientRect();
        return [
          box('#daily-zones').bottom - box('#stage-panel').bottom,
          box('#member-chart-review .hero-market').top - box('#member-chart-review').top,
          box('#founder').bottom - box('#founder .credential-chips').bottom,
          box('#resources').bottom - box('.resource-window').bottom,
          box('#briefing-signup > div').top - box('#briefing-signup').top,
        ];
      });
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(24);
      expect(Math.max(...gaps)).toBeLessThanOrEqual(48);
      expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(2);
    }
    await expect(page.locator('.hero .hero-market')).toHaveCount(0);
    await expect(page.locator('#member-chart-review .published-chart')).toHaveCount(1);
    await expect(page.locator('#desk-invite-title')).toHaveText('Get Jay’s Daily Zones.');
    await expect(page.locator('#desk-membership .button')).toHaveAttribute('href', 'desk/');
    await expect(page.locator('#desk-membership')).toContainText('$99/month');
    const labelContrast = await page.locator('#desk-membership .eyebrow').evaluate(label => {
      const luminance = color => {
        const channels = color.match(/[\d.]+/g).slice(0, 3).map(value => {
          const channel = Number(value) / 255;
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
        });
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      };
      const foreground = luminance(getComputedStyle(label).color);
      const background = luminance(getComputedStyle(label.closest('section')).backgroundColor);
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    });
    expect(labelContrast).toBeGreaterThanOrEqual(4.5);
    await page.locator('#desk-membership').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('#desk-membership img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    const portalGif = page.locator('#home-desk-gif');
    await portalGif.scrollIntoViewIfNeeded();
    await expect(portalGif).toHaveAttribute('src', 'assets/tgi-forex-portal-walkthrough.gif?v=20261011-positions');
    await expect.poll(() => portalGif.evaluate(img => img.complete && img.naturalWidth === 960 && img.naturalHeight === 660), {timeout:15000}).toBe(true);
    await page.getByRole('button', {name:'Stop animation', exact:true}).click();
    await expect(portalGif).toHaveAttribute('src', 'assets/tgi-forex-portal-walkthrough-poster.webp?v=20261011-positions');
    await page.getByRole('button', {name:'Play animation', exact:true}).click();
    await expect(portalGif).toHaveAttribute('src', 'assets/tgi-forex-portal-walkthrough.gif?v=20261011-positions');
    await expect(page.locator('#founder-title')).toHaveText('Why Jay started TGI.');
    await expect(page.locator('#founder-story')).toBeVisible();
    await expect(page.locator('#founder-story')).toContainText('Jay started TGI to explain his Daily Zones approach');
    await expect(page.locator('#founder details, #founder summary')).toHaveCount(0);
    if ([1440, 390].includes(size.width)) {
      for (const section of ['daily-zones', 'member-chart-review', 'desk-membership', 'founder']) {
        await page.locator(`#${section}`).screenshot({path:testInfo.outputPath(`home-flow-${section}-${size.width}.png`), animations:'disabled', style:'.site-header,.skip-link{visibility:hidden!important}'});
      }
    }
    if (size.width === 390) {
      await page.locator('#desk-membership .button').click();
      await expect(page).toHaveURL(/\/desk\/$/);
      await expect(page.locator('.desk-join').first()).toContainText('Join the TGI Operating Desk');
      await page.goto('/#framework');
      await expect(page.locator('#framework')).toBeInViewport();
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.locator('.pathway-track a[href="desk/"]')).toContainText('TGI Operating Desk');
    await expect(page.locator('.case-study, .case-metrics')).toHaveCount(0);
  }
});

test('price behavior slides show distinct candles and keep notes below the controls', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const errors=captureErrors(page);
  const names=['Sideways price','Move outside a range','Strong move','Pullback'];
  for (const width of [1440,390,320]) {
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    const shapes=[];
    for (let index=0;index<4;index++) {
      const tab=page.locator(`#cycle-tab-${index}`);
      await tab.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
      await tab.click();
      await expect(page.locator('#cycle-diagram')).toHaveAttribute('data-cycle-step',String(index));
      await expect(page.locator('#cycle-diagram')).toHaveAccessibleName(`${names[index]}: candlestick example`);
      await expect(page.locator('#cycle-diagram')).toHaveAccessibleDescription(/Teaching chart.*not live market data/);
      const visible=page.locator(`[data-cycle-candles="${index}"]`);
      await expect(visible).toBeVisible();
      await expect(visible.locator('.cycle-candle')).toHaveCount(18);
      for (let other=0;other<4;other++) if(other!==index) await expect(page.locator(`[data-cycle-candles="${other}"]`)).toBeHidden();
      const geometry=await visible.evaluate(group=>{
        const svg=group.ownerSVGElement, scale=svg.getBoundingClientRect().width/640;
        const bodies=[...group.querySelectorAll('.cycle-candle rect')].map(body=>({x:Number(body.getAttribute('x')),y:Number(body.getAttribute('y')),height:Number(body.getAttribute('height')),width:Number(body.getAttribute('width'))}));
        return {width:Math.min(...bodies.map(body=>body.width))*scale,inside:bodies.every(body=>body.x>=0&&body.x+body.width<=640&&body.y>=0&&body.y+body.height<=360),shape:bodies.map(body=>`${body.y}:${body.height}`).join(',')};
      });
      shapes.push(geometry.shape);
      expect(geometry.width).toBeGreaterThanOrEqual(5);
      expect(geometry.inside).toBe(true);
      const layout=await page.evaluate(()=>{
        const rect=selector=>document.querySelector(selector).getBoundingClientRect();
        return {visual:rect('#cycle-visual').bottom,caption:rect('#cycle-tooltip').top,sliderBottom:rect('#cycle-scrubber').bottom,note:rect('.cycle-example-note').top,panel:rect('#cycle-chart').bottom,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      expect(layout.caption).toBeGreaterThanOrEqual(layout.visual-1);
      expect(layout.note).toBeGreaterThanOrEqual(layout.panel+8);
      expect(layout.sliderBottom).toBeLessThanOrEqual(layout.note);
      expect(layout.overflow).toBe(false);
      if(width!==320) await page.locator('.market-cycle').screenshot({path:testInfo.outputPath(`cycle-candles-${width}-${index}.png`),animations:'disabled',style:'.site-header,.skip-link{visibility:hidden!important}'});
    }
    expect(new Set(shapes).size).toBe(4);
    await page.locator('#cycle-tab-0').focus();
    await page.keyboard.press('End');
    await expect(page.locator('#cycle-diagram')).toHaveAttribute('data-cycle-step','3');
    await page.locator('#cycle-next').click();
    await expect(page.locator('#cycle-diagram')).toHaveAttribute('data-cycle-step','0');
    await page.locator('#cycle-prev').click();
    await expect(page.locator('#cycle-diagram')).toHaveAttribute('data-cycle-step','3');
    await page.locator('#cycle-scrubber').focus();
    await page.keyboard.press('Home');
    await expect(page.locator('#cycle-diagram')).toHaveAttribute('data-cycle-step','0');
    await page.keyboard.press('End');
    await expect(page.locator('#cycle-diagram')).toHaveAttribute('data-cycle-step','3');
  }
  expect(errors).toEqual([]);
});

test('homepage slideshows advance in view and keep their layout stable', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const errors = captureErrors(page);
  await page.clock.install();
  const shows = [
    { name:'steps', root:'#daily-zones', view:'#stage-panel', value:'#stage-current', initial:'01', next:'02', wait:4100 },
    { name:'charts', root:'#member-chart-review', view:'#hero-chart-panel', value:'#hero-symbol', initial:'DXY', next:'NAS100', wait:4100 },
    { name:'benefits', root:'.briefing-benefits', view:'#benefits-track', value:'#benefits-count', initial:'01 / 03', next:'02 / 03', wait:4100, mobile:true },
    { name:'paths', root:'.pathway', view:'#paths-track', value:'#paths-count', initial:'01 / 03', next:'02 / 03', wait:4100, mobile:true },
    { name:'cycle', root:'.market-cycle', view:'#cycle-chart', value:'#cycle-count', initial:'03 / 04', next:'04 / 04', wait:4100 },
    { name:'resources', root:'#resources', view:'.resource-window', value:'#resources-count', initial:'01 / 08', next:'02 / 08', wait:4100 },
  ];
  for (const width of [390, 1440]) {
    await page.setViewportSize({width, height:900});
    for (const show of shows) {
      await page.goto('/');
      await page.mouse.move(0, 0);
      const root = page.locator(show.root);
      const view = page.locator(show.view);
      const value = page.locator(show.value);
      const arrows = root.locator(".slideshow-arrow");
      await expect(page.locator("[data-slideshow-toggle], .slideshow-toolbar")).toHaveCount(0);
      await view.scrollIntoViewIfNeeded();
      if (show.mobile && width > 620) {
        await expect(root).toHaveAttribute('data-slideshow-state', 'static');
        await expect(arrows.first()).toBeHidden();
        await page.clock.fastForward(show.wait);
        await expect(value).toHaveText(show.initial);
        continue;
      }
      await expect(root).toHaveAttribute('data-slideshow-state', 'playing');
      await expect(arrows).toHaveCount(2);
      await expect(arrows.first()).toBeVisible();
      await expect(arrows.last()).toBeVisible();
      expect(await arrows.first().evaluate(el => { const box=el.getBoundingClientRect(); return box.width>=44 && box.height>=44 && parseFloat(getComputedStyle(el).opacity)<1; })).toBe(true);
      const before = await root.boundingBox();
      await page.clock.fastForward(show.wait);
      await expect(value).toHaveText(show.next);
      const after = await root.boundingBox();
      expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(2);
      await page.evaluate(() => scrollTo(0, 0));
      await expect(root).toHaveAttribute('data-slideshow-state', 'waiting');
      await page.clock.fastForward(show.wait * 3);
      await expect(value).toHaveText(show.next);
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#resources');
  await page.locator('#resources').screenshot({path:testInfo.outputPath('automatic-resources-390.png'), animations:'disabled', style:'.site-header,.skip-link{visibility:hidden!important}'});
  expect(errors).toEqual([]);
});

test('gold edge arrows, fades, touch and reduced motion preserve reading control', async ({ page }, testInfo) => {
  await page.setViewportSize({width:390,height:844});
  await page.clock.install();
  await page.goto('/');
  const root=page.locator('#daily-zones'), panel=page.locator('#stage-panel'), current=page.locator('#stage-current');
  await panel.scrollIntoViewIfNeeded();
  await page.mouse.move(0,0);
  await expect(root).toHaveAttribute('data-slideshow-state','playing');
  await panel.dispatchEvent('pointerdown',{pointerId:8,pointerType:'touch',isPrimary:true,clientX:220,clientY:220});
  await expect(root).toHaveAttribute('data-slideshow-state','paused');
  await page.clock.fastForward(12000);
  await expect(current).toHaveText('01');
  await panel.dispatchEvent('pointerup',{pointerId:8,pointerType:'touch',isPrimary:true,clientX:100,clientY:220});
  await expect(current).toHaveText('02');
  await page.locator('#stage-next').click();
  await expect.poll(() => panel.evaluate(el => el.getAnimations().some(a => a.effect.getKeyframes().some(k => k.opacity === '0')))).toBe(true);
  await expect(current).toHaveText('03');
  await page.locator('#stage-prev').click();
  await expect(current).toHaveText('02');
  await page.locator('#stage-tab-0').focus();
  await page.keyboard.press('ArrowRight');
  await expect(current).toHaveText('02');
  await expect(root).toHaveAttribute('data-slideshow-state','paused');
  await page.clock.fastForward(12000);
  await expect(current).toHaveText('02');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();
  await panel.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute('data-slideshow-state','paused');
  await page.clock.fastForward(12000);
  await expect(current).toHaveText('01');
  await page.locator('#stage-next').click();
  await expect(current).toHaveText('02');
  expect(await panel.evaluate(el => el.getAnimations().length)).toBe(0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('[data-hero-market="GOLD"]').click();
  await expect(page.locator('#hero-symbol')).toHaveText('GOLD');
  const frame=page.locator('.published-chart-media');
  for(const id of ['hero-market-prev','hero-market-next']) {
    const button=page.locator(`#${id}`);
    expect(await button.evaluate(el => el.closest('a')===null)).toBe(true);
    const arrow=await button.boundingBox(), box=await frame.boundingBox();
    expect(Math.abs(arrow.y+arrow.height/2-box.y-box.height/2)).toBeLessThan(2);
    expect(arrow.x>=box.x && arrow.x+arrow.width<=box.x+box.width).toBe(true);
  }
  await page.locator('#hero-market-next').click();
  await expect(page.locator('#hero-symbol')).toHaveText('USDJPY');
  await page.locator('#hero-market-prev').click();
  await expect(page.locator('#hero-symbol')).toHaveText('GOLD');
  await page.locator('#hero-chart-panel').screenshot({path:testInfo.outputPath('gold-chart-edge-arrows-390.png'),animations:'disabled',style:'.site-header,.skip-link{visibility:hidden!important}'});
});

test('homepage stays readable with reduced motion or JavaScript disabled',async({browser})=>{
 for (const options of [{reducedMotion:'reduce'},{javaScriptEnabled:false}]) {
  const context=await browser.newContext({...options,viewport:{width:390,height:844}});
  try {
   const page=await context.newPage();await page.goto('http://127.0.0.1:4173/');
   await expect(page.locator('h1')).toBeVisible();await expect(page.locator('.hero-copy')).toHaveCSS('opacity','1');
   await expect(page.locator('.home-zone-key')).toBeVisible();await expect(page.locator('.hero-actions .button')).toHaveAttribute('href','newsletter/');
   await expect(page.locator('#stage-diagram')).toHaveAccessibleName('Start with the daily chart');
   await expect(page.locator('#stage-diagram .lesson-context')).toBeVisible();
   await expect(page.locator('#stage-caption')).toContainText('daily candles');
   await expect(page.locator('#founder-story')).toBeVisible();
   await expect(page.locator('#founder details, #founder summary')).toHaveCount(0);
   await expect(page.locator('#desk-membership .button')).toHaveAttribute('href','desk/');
   await expect(page.locator('#daily-zones [data-stage]')).toHaveCount(5);
   const gif=page.locator('#home-desk-gif');await gif.scrollIntoViewIfNeeded();
   await expect(gif).toHaveAttribute('src','assets/tgi-forex-portal-walkthrough-poster.webp?v=20261011-positions');
   if(options.javaScriptEnabled===false) await expect(page.locator('[data-desk-gif-control]')).toBeHidden();
   else {
    await page.getByRole('button',{name:'Play animation',exact:true}).click();
    await expect(gif).toHaveAttribute('src','assets/tgi-forex-portal-walkthrough.gif?v=20261011-positions');
    await page.getByRole('button',{name:'Stop animation',exact:true}).click();
    await expect(gif).toHaveAttribute('src','assets/tgi-forex-portal-walkthrough-poster.webp?v=20261011-positions');
   }
  } finally {await context.close();}
 }
});

test('five Daily Zones steps explain one setup with accessible charts', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const errors = captureErrors(page);
  const lessons = [
    { title: 'Start with the daily chart', label: 'One candle = one day', caption: 'daily candles', layer: '.lesson-context' },
    { title: 'Mark Daily Zones', label: 'Daily Supply', caption: 'Daily Demand', layer: '.lesson-zone-labels' },
    { title: 'Watch how price reacts', label: 'Watch the close', caption: 'conditions in your plan', layer: '.lesson-reaction' },
    { title: 'Plan your risk before entering', label: 'Plan the loss before entry', caption: 'Stops may fill beyond', layer: '.lesson-risk-heading' },
    { title: 'Review your trading decision', label: 'Outcome: target reached', caption: 'twice the amount risked', layer: '.lesson-review' },
  ];
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#framework');
    const originalCandles = await page.locator('.lesson-candles').innerHTML();
    for (const [index, lesson] of lessons.entries()) {
      const tab = page.locator(`[data-stage="${index}"]`);
      // A chart screenshot scrolls the tabs above the fixed header. Center them
      // instantly before the next real click so Safari does not click mid-scroll.
      await tab.evaluate(element => element.scrollIntoView({block:'center', inline:'nearest', behavior:'instant'}));
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(tab).toHaveAttribute('tabindex', '0');
      await expect(page.locator('[data-stage][aria-selected="true"]')).toHaveCount(1);
      await expect(page.locator('#stage-panel')).toHaveAttribute('aria-labelledby', `stage-tab-${index}`);
      await expect(page.locator('#stage-title')).toHaveText(lesson.title);
      await expect(page.locator('#stage-diagram')).toHaveAccessibleName(lesson.title);
      await expect(page.locator('#stage-diagram')).toHaveAccessibleDescription(/Teaching chart.*No real market prices/);
      await expect(page.locator('#stage-diagram').getByText(lesson.label, { exact: true })).toBeVisible();
      await expect(page.locator(lesson.layer)).toBeVisible();
      await expect(page.locator('#stage-caption')).toContainText(lesson.caption);
      await expect(page.locator('.lesson-example-note')).toContainText('not live data');
      expect(await page.locator('.lesson-candles').innerHTML()).toBe(originalCandles);
      if (index < 4) await expect(page.locator('.lesson-future')).toBeHidden();
      else await expect(page.locator('.lesson-future')).toBeVisible();
      if (index >= 3) {
        await expect(page.locator('.lesson-risk')).toBeVisible();
        // Horizontal SVG paths have zero-height boxes in Chromium and WebKit.
        // Verify the rendered stroke and parent visibility, then inspect the screenshot.
        for (const line of ['.lesson-entry-line', '.lesson-stop-line', '.lesson-target-line']) {
          await expect(page.locator(line)).toHaveCSS('stroke-width', '2px');
          expect(await page.locator(line).evaluate(path => path.getBBox().width)).toBeGreaterThan(90);
        }
      }
      if (index === 4) {
        await expect(page.locator('.lesson-review').getByText('Example profit: +2R', { exact: true })).toBeVisible();
        await expect(page.locator('.lesson-target-hit')).toBeVisible();
      }
      const layout = await page.locator('#stage-diagram').evaluate((svg) => {
        const bounds = svg.getBoundingClientRect();
        const visibleLabels = [...svg.querySelectorAll('text')].filter(label => label.getBoundingClientRect().width > 0);
        return {
          fits: bounds.left >= 0 && bounds.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1,
          smallestLabel: Math.min(...visibleLabels.map(label => parseFloat(getComputedStyle(label).fontSize) * bounds.width / svg.viewBox.baseVal.width)),
          labelsFit: visibleLabels.every(label => { const box = label.getBBox(); return box.x >= 0 && box.x + box.width <= 520; }),
        };
      });
      expect(layout.fits).toBe(true);
      expect(layout.smallestLabel).toBeGreaterThanOrEqual(13);
      expect(layout.labelsFit).toBe(true);
      if (width !== 320) {
        await page.locator('.stage-chart-wrap').screenshot({ path: testInfo.outputPath(`lesson-${width}-${index + 1}.png`), animations: 'disabled' });
      }
    }
    const lastTab = page.locator('[data-stage="4"]');
    await lastTab.focus();
    await page.keyboard.press('Home');
    await expect(page.locator('[data-stage="0"]')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(lastTab).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-stage="0"]')).toBeFocused();
    await page.keyboard.press('End');
    await expect(lastTab).toBeFocused();
    expect(await lastTab.evaluate(tab => {
      const box = tab.getBoundingClientRect();
      const strip = tab.parentElement.getBoundingClientRect();
      return box.left >= strip.left - 1 && box.right <= strip.right + 1;
    })).toBe(true);
    await page.locator('#stage-next').click();
    await expect(page.locator('#stage-current')).toHaveText('01');
    await page.locator('#stage-next').click();
    await expect(page.locator('#stage-current')).toHaveText('02');
    await page.locator('#stage-prev').click();
    await expect(page.locator('#stage-current')).toHaveText('01');
    await page.reload();
    await expect(page.locator('#stage-title')).toHaveText(lessons[0].title);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-stage="2"]').click();
  await expect(page.locator('.stage-chart-wrap')).toHaveCSS('animation-name', 'none');
  expect(errors).toEqual([]);
});

test('resource carousel shows the offers and reaches every card', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const cardFits = (card) => card.evaluate((element) => {
    const cardBox = element.getBoundingClientRect();
    const viewportBox = element.parentElement.parentElement.getBoundingClientRect();
    return cardBox.left >= viewportBox.left - 1 && cardBox.right <= viewportBox.right + 1;
  });
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.goto('/#resources');
    const cards = page.locator('.resource-card');
    await expect(cards).toHaveCount(8);
    for (const [index, href] of ['dzc/', 'mentor/', 'desk/'].entries()) {
      await expect(cards.nth(index)).toHaveAttribute('href', href);
    }
    for (let index = 0; index < 8; index += 1) {
      const card = cards.nth(index);
      await expect(card).toHaveClass(/is-featured/);
      await expect(page.locator('#resources-count')).toHaveText(`${String(index + 1).padStart(2, '0')} / 08`);
      await expect.poll(() => cardFits(card)).toBe(true);
      await expect.poll(() => card.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
      if (size.width === 390 || index < 3) {
        await card.screenshot({ path: testInfo.outputPath(`resource-${size.width}-${index + 1}.png`), animations: 'disabled' });
      }
      if (index < 7) await page.getByRole('button', { name: 'Next resource', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Next resource', exact: true }).click();
    await expect(page.locator('#resources-count')).toHaveText('01 / 08');
    await page.getByRole('button', { name: 'Previous resource', exact: true }).click();
    await expect(page.locator('#resources-count')).toHaveText('08 / 08');
    for (const width of [900, 375]) {
      await page.setViewportSize({ width, height: 844 });
      await expect.poll(() => cardFits(cards.nth(7))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await cards.nth(0).focus();
    await expect(cards.nth(0)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cards.nth(1)).toBeFocused();
    await expect.poll(() => cardFits(cards.nth(1))).toBe(true);
    await page.keyboard.press('Tab');
    await expect(cards.nth(2)).toBeFocused();
    await expect.poll(() => cardFits(cards.nth(2))).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/desk\/$/);
  }
});

test('homepage shows the original dated member charts without duplication', async ({ page }, testInfo) => {
  const charts = [
    ['DXY', 'dxy-2026-10-18.webp', 'Daily', '18 October 2026', 1484],
    ['NAS100', 'nas100-2026-10-18.webp', 'Daily', '18 October 2026', 1484],
    ['GOLD', 'gold-2026-10-18.webp', 'Daily', '18 October 2026', 1484],
    ['USDJPY', 'usdjpy-4h-2026-10-12.webp', '4H', '12 October 2026', 1310],
  ];
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.locator('.briefing-dashboard')).toHaveCount(0);
    await expect(page.locator('.published-chart')).toHaveCount(1);
    for (const [prefix, attribute] of [['hero', 'data-hero-market']]) {
      const panel = page.locator(`#${prefix}-chart-panel`);
      for (const [symbol, file, timeframe, date, height] of charts) {
        const tab = page.locator(`[${attribute}="${symbol}"]`);
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        await expect(panel).toHaveAttribute('aria-labelledby', await tab.getAttribute('id'));
        const image = page.locator(`#${prefix}-chart-image`);
        await expect(image).toHaveAttribute('src', `assets/member-charts/${file}`);
        await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth === 2048)).toBe(true);
        await expect(image).toHaveAttribute('height', String(height));
        await expect(image).toHaveAttribute('alt', new RegExp(`${symbol} ${timeframe}.*${date}`));
        await expect(page.locator(`#${prefix}-chart-caption`)).toHaveText(`${symbol} · ${timeframe} · ${date}`);
        await expect(panel).toContainText('Published member chart · Not live data.');
        const full = page.locator(`#${prefix}-chart-open`);
        await expect(full).toHaveAttribute('href', `assets/member-charts/${file}`);
        await expect(full).toHaveAttribute('target', '_blank');
        const ratio = await image.evaluate(element => {
          const rect = element.getBoundingClientRect();
          return Math.abs(rect.width / rect.height - element.naturalWidth / element.naturalHeight);
        });
        expect(ratio).toBeLessThan(.01);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (size.width === 390) await panel.screenshot({ path: testInfo.outputPath(`member-chart-${prefix}-${symbol}-390.png`) });
      }
      const first = page.locator(`[${attribute}="DXY"]`);
      await first.focus();
      await page.keyboard.press('End');
      await expect(page.locator(`[${attribute}="USDJPY"]`)).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(first).toBeFocused();
      await expect(first).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`#${prefix}-chart-caption`)).toContainText('DXY · Daily');
    }
  }
});

test('mobile chart gestures and card rails keep navigation usable', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const errors = captureErrors(page);
  const swipe = async (selector, dx, dy = 0, pointerType = 'touch') => {
    const target = page.locator(selector);
    await target.dispatchEvent('pointerdown', { pointerId: 7, pointerType, isPrimary: true, clientX: 220, clientY: 220 });
    await target.dispatchEvent('pointerup', { pointerId: 7, pointerType, isPrimary: true, clientX: 220 + dx, clientY: 220 + dy });
  };
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.locator('.published-chart')).toHaveCount(1);
    await expect(page.locator('[data-instrument]')).toHaveCount(0);
    await expect(page.locator('#hero-market-count')).toHaveText('01 / 04');
    await swipe('#hero-chart-panel', -120);
    await expect(page.locator('#hero-symbol')).toHaveText('NAS100');
    const clickAllowed = await page.locator('#hero-chart-open').evaluate(link => link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })));
    expect(clickAllowed).toBe(false);
    for (const [dx, dy, kind] of [[10, 150, 'touch'], [20, 0, 'touch'], [-120, 0, 'mouse']]) {
      await swipe('#hero-chart-panel', dx, dy, kind);
      await expect(page.locator('#hero-symbol')).toHaveText('NAS100');
    }
    await page.locator('#hero-market-next').click();
    await expect(page.locator('#hero-symbol')).toHaveText('GOLD');
    await swipe('#hero-chart-panel', 120);
    await expect(page.locator('#hero-symbol')).toHaveText('NAS100');
    await expect(page.locator('#hero-chart-open')).toHaveAttribute('target', '_blank');
    await expect(page.locator('#hero-market-count')).toHaveText('02 / 04');

    await swipe('#stage-panel', -120);
    await expect(page.locator('#stage-title')).toHaveText('Mark Daily Zones');
    await swipe('#stage-panel', 10, 140);
    await expect(page.locator('#stage-current')).toHaveText('02');
    await swipe('#stage-panel', 120);
    await expect(page.locator('#stage-current')).toHaveText('01');
    await swipe('#cycle-chart', -120);
    await expect(page.locator('#cycle-tooltip span')).toHaveText('Pullback');
    await expect(page.locator('#cycle-count')).toHaveText('04 / 04');
    await page.locator('#cycle-prev').click();
    await expect(page.locator('#cycle-tooltip span')).toHaveText('Strong move');
    await swipe('#cycle-scrubber', -120);
    await expect(page.locator('#cycle-tooltip span')).toHaveText('Strong move');

    await swipe('.resource-window', -120);
    await expect(page.locator('#resources-count')).toHaveText('02 / 08');
    const compatibilityFocusAllowed = await page.locator('.resource-card').first().evaluate(link => link.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 1 })));
    expect(compatibilityFocusAllowed).toBe(false);
    await swipe('.resource-window', 120);
    await expect(page.locator('#resources-count')).toHaveText('01 / 08');
    await page.locator('.resource-card').first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.resource-card').nth(1)).toBeFocused();
    await expect(page.locator('#resources-count')).toHaveText('02 / 08');

    for (const prefix of ['benefits', 'paths']) {
      const track = page.locator(`#${prefix}-track`);
      await expect.poll(() => track.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
      await page.locator(`#${prefix}-next`).click();
      await expect(page.locator(`#${prefix}-count`)).toHaveText('02 / 03');
      await track.evaluate(el => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }));
      await expect(page.locator(`#${prefix}-count`)).toHaveText('03 / 03');
      await expect(page.locator(`#${prefix}-next`)).toBeDisabled();
      const lastCardFits = await track.locator('.mobile-swipe-card').last().evaluate(card => {
        const box = card.getBoundingClientRect(), viewport = card.parentElement.getBoundingClientRect();
        return box.left >= viewport.left - 1 && box.right <= viewport.right + 1;
      });
      expect(lastCardFits).toBe(true);
      await track.focus();
      await page.keyboard.press('Home');
      await expect(page.locator(`#${prefix}-count`)).toHaveText('01 / 03');
      await page.keyboard.press('ArrowRight');
      await expect(page.locator(`#${prefix}-count`)).toHaveText('02 / 03');
      if (width === 390) {
        const capture = prefix === 'benefits' ? page.locator('.briefing') : page.locator('.pathway');
        await capture.screenshot({ path: testInfo.outputPath(`mobile-swipe-${prefix}.png`), animations: 'disabled' });
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.hero-actions .button')).toHaveAttribute('href', 'newsletter/');
    await page.reload();
    await expect(page.locator('#hero-symbol')).toHaveText('DXY');
    await expect(page.locator('#stage-current')).toHaveText('01');
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await swipe('#hero-chart-panel', -120);
  await expect(page.locator('#hero-symbol')).toHaveText('DXY');
  await expect(page.locator('#hero-market-next')).toBeVisible();
  await page.locator('[data-hero-market="GOLD"]').click();
  await expect(page.locator('#hero-symbol')).toHaveText('GOLD');
  await page.locator('.briefing').screenshot({ path: testInfo.outputPath('briefing-desktop-without-duplicate.png'), animations: 'disabled' });
  expect(errors).toEqual([]);
});
