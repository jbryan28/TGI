import { test, expect } from '@playwright/test';

const sizes=[{width:1440,height:900},{width:390,height:844},{width:375,height:667},{width:320,height:568}];
function errorsFor(page) { const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});return errors; }
async function contrast(locator) {
 return locator.evaluate(el=>{
  const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
  const luminance=s=>rgb(s).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
  const st=getComputedStyle(el);const a=luminance(st.color),b=luminance(st.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 });
}
for(const size of sizes) {
 test(`Mentoring booking page at ${size.width}px`,async({page},testInfo)=>{
  const errors=errorsFor(page);await page.setViewportSize(size);
  // Load the requested extensionless route, including its directory redirect.
  await page.goto('/mentoring');await page.reload();
  await expect(page).toHaveTitle('Daily Zone Command™ Mentorship | Trader Growth Institute');
  const heading=page.getByRole('heading',{level:1,name:'Work directly with Jay Bryan'});
  const price=page.locator('.price'),cta=page.getByRole('link',{name:'Book with Jay',exact:true});
  await expect(heading).toBeVisible();await expect(price).toHaveText('$400 USD · One-time payment');
  await expect(cta).toHaveAttribute('href','https://calendly.com/dailyzonecommand/mentorship');
  expect(await cta.getAttribute('target')).toBeNull();
  for(const el of [heading,price,cta]) {const box=await el.boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(size.height);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.description')).toContainText('private 75-minute session');
  await expect(page.locator('.description')).toContainText('one follow-up chart review');
  await expect(page.locator('.membership-note')).toContainText('purchased separately');
  await expect(page.getByRole('img',{name:'Jay Bryan, founder of Trader Growth Institute'})).toBeVisible();
  expect(await contrast(cta)).toBeGreaterThanOrEqual(4.5);
  await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to mentoring'})).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Trader Growth Institute home'})).toBeFocused();
  await page.keyboard.press('Tab');await expect(cta).toBeFocused();
  expect(await cta.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
  await cta.blur();await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:testInfo.outputPath(`mentoring-${size.width}.png`),fullPage:true});
  // Verify the real link navigates this tab; never submit or pay for a booking.
  await page.route('https://calendly.com/dailyzonecommand/mentorship',route=>route.fulfill({contentType:'text/html',body:'<title>Booking destination test</title>'}));
  await cta.click();await expect(page).toHaveURL('https://calendly.com/dailyzonecommand/mentorship');
  expect(errors).toEqual([]);
 });
 test(`Mentoring preparation page at ${size.width}px`,async({page},testInfo)=>{
  const errors=errorsFor(page);await page.setViewportSize(size);
  await page.goto('/mentoring/confirmed?invitee_full_name=UnverifiedPerson&invitee_payment_amount=9999');await page.reload();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Thank you. Let’s prepare for your session.');
  await expect(page.locator('.intro')).toContainText('booking email');await expect(page.locator('.intro')).toContainText('Microsoft Teams');
  await expect(page.locator('.preparation')).toContainText('two historical trading decisions');
  await expect(page.locator('.preparation')).toContainText('three annotated charts');
  await expect(page.locator('.preparation')).toContainText('main question');await expect(page.locator('.preparation')).toContainText('48 hours');
  await expect(page.locator('.privacy-note')).toContainText('account numbers, balances, and other private information');
  await expect(page.locator('body')).not.toContainText('UnverifiedPerson');await expect(page.locator('body')).not.toContainText('9999');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, follow');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const cta=page.getByRole('link',{name:'Email your charts',exact:true});
  const href=await cta.getAttribute('href');expect(href.split('?')[0]).toBe('mailto:justin@tradergrowth.com');
  expect(new URLSearchParams(href.split('?')[1]).get('subject')).toContain('Chart Preparation');
  expect(await contrast(cta)).toBeGreaterThanOrEqual(4.5);
  await cta.evaluate(el=>el.addEventListener('click',e=>{e.preventDefault();window.mentoringEmailClicked=el.href;}));
  await cta.focus();await cta.press('Enter');expect(await page.evaluate(()=>window.mentoringEmailClicked)).toBe(href);
  await cta.blur();await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:testInfo.outputPath(`mentoring-confirmed-${size.width}.png`),fullPage:true});
  await page.getByRole('link',{name:'Return to Operating Desk'}).click();await expect(page).toHaveURL(/\/desk\/$/);
  expect(errors).toEqual([]);
 });
}
test('Mentoring pages work without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:667}});
 const page=await context.newPage();
 for(const url of ['/mentoring/','/mentoring/confirmed/']) {
  await page.goto('http://127.0.0.1:4173'+url);await page.reload();
  await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect(page.locator('.primary-cta')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await context.close();
});
