import { test, expect } from '@playwright/test';

test('guide signup is email-first on desktop and mobile', async ({ page }) => {
  await page.route('https://subscribe-forms.beehiiv.com/v3/loader.js', route => route.fulfill({contentType:'application/javascript', body:`const form=document.createElement('form'); form.innerHTML='<label>Email<input type="email" required></label><button>Email me the free guide</button>'; document.currentScript.parentElement.appendChild(form);`}));
  await page.route('https://subscribe-forms.beehiiv.com/attribution.js', route => route.fulfill({body:''}));
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    await page.goto('/dollar/');
    await expect(page.getByRole('heading', {name:'Follow the dollar. Understand the system.'})).toBeVisible();
    await expect(page.locator('#dollar-embed-host form')).toBeVisible();
    await expect(page.locator('#signup-status')).toBeHidden();
    expect(await page.locator('a[href*=".pdf"], a[download]').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.locator('.site-header .brand').getAttribute('href')).toBe('/');
    await page.getByRole('link',{name:'Email me the free guide',exact:true}).click();
    await expect(page.locator('#signup')).toBeInViewport();
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
  }
});

test('provider failure never claims successful capture or unlocks the PDF', async ({ page }) => {
  await page.route('https://subscribe-forms.beehiiv.com/**', route => route.abort());
  await page.goto('/dollar/');
  await expect(page.locator('#signup-status')).toContainText('could not load');
  expect(await page.locator('a[href*=".pdf"], a[download]').count()).toBe(0);
});
