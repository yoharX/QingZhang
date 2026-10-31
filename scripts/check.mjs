import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const EXE = join(homedir(), 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const BASE = 'http://127.0.0.1:4173/';
const OUT = join(process.cwd(), '.shots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByText('用演示账号进去看看').click();
await page.waitForTimeout(1500);

// 流水页首屏
await page.goto(BASE + '#/txns', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.screenshot({ path: join(OUT, '11-txns-top.png') });

// 校验分类排行是否严格降序
await page.goto(BASE + '#/insights', { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
const ranks = await page.$$eval('.rank-row', (rows) =>
  rows.map((r) => ({
    name: r.querySelector('.rank-name')?.textContent,
    val: r.querySelector('.rank-val')?.textContent,
  }))
);
console.log('RANKS', JSON.stringify(ranks));

const values = ranks.map((r) => Number((r.val || '').replace(/[^\d.]/g, '')));
const sorted = values.every((v, i) => i === 0 || values[i - 1] >= v);
console.log('SORTED_DESC', sorted, values.join(','));

// 检查横向溢出
const overflow = await page.evaluate(() => {
  const de = document.documentElement;
  return { scrollW: de.scrollWidth, clientW: de.clientWidth };
});
console.log('OVERFLOW', JSON.stringify(overflow));

await browser.close();
