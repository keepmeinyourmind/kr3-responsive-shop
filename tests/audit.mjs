import lighthouse from 'lighthouse';
import { chromium } from 'playwright';
import { launch } from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.BASE_URL || 'http://127.0.0.1:8123';
const output = new URL('../lighthouse/', import.meta.url);
await mkdir(output, { recursive: true });
const chrome = await launch({
  chromePath: process.env.CHROME_PATH || chromium.executablePath(),
  chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  for (const page of ['index', 'catalog', 'order']) {
    const result = await lighthouse(`${base}/${page}.html`, {
      port: chrome.port, onlyCategories: ['accessibility'], output: ['html', 'json'],
      logLevel: 'error', formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 360, height: 800, deviceScaleFactor: 1, disabled: false },
    });
    if (result.lhr.runtimeError) throw new Error(JSON.stringify(result.lhr.runtimeError));
    await writeFile(new URL(`${page}-accessibility.html`, output), result.report[0]);
    await writeFile(new URL(`${page}-accessibility.json`, output), result.report[1]);
    console.log(`${page}: ${Math.round(result.lhr.categories.accessibility.score * 100)}/100`);
  }
} finally { await chrome.kill(); }
