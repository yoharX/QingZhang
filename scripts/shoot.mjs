import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const EXE = join(homedir(), 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const BASE = 'http://127.0.0.1:4173/';
const OUT = join(process.cwd(), '.shots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.screenshot({ path: join(OUT, '01-login.png') });

await page.getByText('用演示账号进去看看').click();
await page.waitForTimeout(1700);
await page.screenshot({ path: join(OUT, '02-home.png'), fullPage: true });

// 记一笔弹窗
await page.getByRole('button', { name: '记一笔' }).first().click();
await page.waitForTimeout(600);
await page.locator('.amount-input').fill('46.8');
await page.locator('#composer-note').fill('楼下咖啡');
await page.waitForTimeout(200);
await page.screenshot({ path: join(OUT, '03-composer.png') });

// 保存动效：对勾
await page.getByRole('button', { name: '保存', exact: true }).click();
await page.waitForTimeout(380);
await page.screenshot({ path: join(OUT, '04-check.png') });
await page.waitForTimeout(700);
await page.screenshot({ path: join(OUT, '05-check-mid.png') });

// 回执
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, '06-receipt.png') });

await page.getByRole('button', { name: '完成' }).click();
await page.waitForTimeout(500);

// 其他页
await page.goto(BASE + '#/txns', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.screenshot({ path: join(OUT, '07-txns.png') });

await page.goto(BASE + '#/insights', { waitUntil: 'networkidle' });
await page.waitForTimeout(1900);
await page.screenshot({ path: join(OUT, '08-insights.png'), fullPage: true });

await page.goto(BASE + '#/me', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.screenshot({ path: join(OUT, '09-me.png'), fullPage: true });

// 账户编辑
await page.getByRole('button', { name: /招商银行|支付宝|微信/ }).first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, '10-account-editor.png') });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// 移动端
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const m = await mobile.newPage();
await m.goto(BASE, { waitUntil: 'networkidle' });
await m.waitForTimeout(500);
await m.getByText('用演示账号进去看看').click();
await m.waitForTimeout(1700);
await m.screenshot({ path: join(OUT, '11-m-home.png'), fullPage: true });

await m.getByRole('button', { name: '记一笔' }).first().click();
await m.waitForTimeout(600);
await m.locator('.amount-input').fill('26');
await m.screenshot({ path: join(OUT, '12-m-composer.png') });
await m.getByRole('button', { name: '保存', exact: true }).click();
await m.waitForTimeout(2000);
await m.screenshot({ path: join(OUT, '13-m-receipt.png') });

console.log('errors:', errors.length ? errors.join(' | ').slice(0, 400) : 'none');
await browser.close();
console.log('done');
