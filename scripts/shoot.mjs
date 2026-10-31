import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const EXE = join(homedir(), 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const BASE = 'http://127.0.0.1:4173/';
const OUT = join(process.cwd(), '.shots');
mkdirSync(OUT, { recursive: true });
const PROXY = 'http://127.0.0.1:59117';

const browser = await chromium.launch({
  executablePath: EXE,
  headless: true,
  proxy: { server: PROXY, bypass: '127.0.0.1,localhost' },
});

const errors = [];
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 940 },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('PAGE: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('CONSOLE: ' + m.text()));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.getByText('用演示账号进去看看').click();
await page.waitForTimeout(6000); // 等天气
await page.screenshot({ path: join(OUT, '01-home.png'), fullPage: true });
console.log('weather text:', (await page.locator('.weather-card').innerText()).replace(/\n/g, ' | '));

// 板块设置
await page.getByRole('button', { name: '板块' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, '02-modules.png') });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// AI 页
await page.goto(BASE + '#/insights', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
await page.screenshot({ path: join(OUT, '03-insights.png'), fullPage: true });

// 我的
await page.goto(BASE + '#/me', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.screenshot({ path: join(OUT, '04-me.png'), fullPage: true });

// 资料编辑
await page.locator('.profile-identity').click();
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, '05-profile-edit.png') });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// AI 设置
await page.locator('.setting-row', { hasText: '分析方式' }).click();
await page.waitForTimeout(500);
await page.getByRole('tab', { name: '接入大模型' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, '06-ai-settings.png') });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// 流水
await page.goto(BASE + '#/txns', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, '07-txns.png') });

// ---------- 移动端 ----------
const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  ignoreHTTPSErrors: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const m = await mctx.newPage();
m.on('pageerror', (e) => errors.push('M-PAGE: ' + e.message));

await m.goto(BASE, { waitUntil: 'networkidle' });
await m.waitForTimeout(500);
await m.screenshot({ path: join(OUT, '11-m-login.png') });
await m.getByText('用演示账号进去看看').click();
await m.waitForTimeout(6000);
await m.screenshot({ path: join(OUT, '12-m-home.png'), fullPage: true });

// 检查横向溢出
const overflow = await m.evaluate(() => ({
  sw: document.documentElement.scrollWidth,
  cw: document.documentElement.clientWidth,
}));
console.log('mobile overflow:', JSON.stringify(overflow), overflow.sw > overflow.cw ? 'OVERFLOW!' : 'ok');

await m.getByRole('button', { name: /自定义首页板块/ }).click();
await m.waitForTimeout(600);
await m.screenshot({ path: join(OUT, '13-m-modules.png') });
await m.keyboard.press('Escape');
await m.waitForTimeout(300);

await m.goto(BASE + '#/insights', { waitUntil: 'networkidle' });
await m.waitForTimeout(1800);
await m.screenshot({ path: join(OUT, '14-m-insights.png'), fullPage: true });

await m.goto(BASE + '#/me', { waitUntil: 'networkidle' });
await m.waitForTimeout(700);
await m.screenshot({ path: join(OUT, '15-m-me.png'), fullPage: true });

await m.goto(BASE + '#/txns', { waitUntil: 'networkidle' });
await m.waitForTimeout(600);
await m.screenshot({ path: join(OUT, '16-m-txns.png') });

console.log('errors:', errors.length ? errors.slice(0, 5).join(' || ') : 'none');
await browser.close();
console.log('done');
