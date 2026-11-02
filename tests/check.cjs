const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
  const page = await browser.newPage();
  const base = process.env.BASE_URL || 'http://127.0.0.1:8123';
  const pages = fs.readdirSync(path.join(__dirname, '..')).filter(f => f.endsWith('.html'));
  const results = [];
  try {
    for (const width of [320, 360, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const file of pages) {
        await page.goto(`${base}/${file}`, { waitUntil: 'domcontentloaded' });
        const state = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          h1: document.querySelectorAll('h1').length,
          brokenImages: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src),
          columns: getComputedStyle(document.querySelector('.products-grid') || document.body).gridTemplateColumns,
        }));
        assert.equal(state.overflow, false, `${file} overflows at ${width}px`);
        assert.equal(state.h1, 1, `${file}: one h1`);
        assert.deepEqual(state.brokenImages, [], `${file}: images load`);
        results.push({ page: file, width, ...state });
      }
    }
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(base);
    assert.equal(await page.locator('.site-nav').isVisible(), true, 'Navigation is always available');
    await page.getByRole('button', { name: 'Заказать', exact: true }).first().click();
    assert.equal(await page.locator('dialog').evaluate(el => el.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog').evaluate(el => el.open), false);
    assert.equal(await page.locator('.product-card__button').first().evaluate(el => el === document.activeElement), true);
    await page.goto(`${base}/order.html?product=MacBook%20Pro`);
    assert.equal(await page.locator('#order-product').inputValue(), 'MacBook Pro');
    await page.getByRole('button', { name: 'Отправить заявку' }).click();
    assert.equal(await page.locator('[aria-invalid="true"]').count() > 0, true);
    await page.locator('#order-name').fill('Максим');
    await page.locator('#order-email').fill('student@example.com');
    await page.locator('#order-phone').fill('+7 (900) 000-00-00');
    await page.locator('#order-topic').selectOption('product');
    await page.locator('#order-agreement').check();
    await page.getByRole('button', { name: 'Отправить заявку' }).click();
    assert.equal(await page.locator('#success-message').isVisible(), true);
    assert.equal(await page.locator('[aria-invalid="true"]').count(), 0);
    await page.goto(`${base}/catalog.html`);
    assert.equal(await page.locator('.filters-form').isVisible(), true);
    assert.equal(await page.locator('.product-card:visible').count(), 6);
    fs.writeFileSync(path.join(__dirname, '../docs/viewport-results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(`PASS: ${results.length} page/viewport checks; static navigation and filters, original dialog and form`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
