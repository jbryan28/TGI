import { test, expect } from '@playwright/test';

test('contact card works on a narrow mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/jay/');
  await expect(page.getByRole('heading', { name: 'Jay Bryan.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('.brand')).toHaveAttribute('href', '/');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Save my contact' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('jay-bryan.vcf');
  const card = await page.request.get('/jay/jay-bryan.vcf');
  expect(await card.text()).toContain('EMAIL;TYPE=INTERNET,WORK:jay@tradergrowth.com');
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
  const qrDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download QR code' }).click();
  expect((await qrDownload).suggestedFilename()).toBe('jay-bryan-tgi-qr.svg');
});

test('sharing provides a usable link when native sharing and clipboard are unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined });
    Object.defineProperty(navigator, 'clipboard', { value: undefined });
  });
  await page.goto('/jay/');
  await page.getByRole('button', { name: 'Share contact page' }).click();
  await expect(page.getByRole('status')).toContainText('https://www.tradergrowth.com/jay/');
});
