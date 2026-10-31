import { chromium } from 'playwright-core';
import { homedir } from 'node:os';
import { join } from 'node:path';

const EXE = join(homedir(), 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const BASE = 'http://127.0.0.1:4173/';

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 940 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// 先把站点打开，才能写同源 localStorage
await page.goto(BASE, { waitUntil: 'domcontentloaded' });

// 构造一份 v1 老数据：没有 accounts，流水没有 accountId，分类是旧 key
const v1 = {
  version: 1,
  user: { name: '老用户', email: 'old@qingzhang.app', budget: 5000, joinedAt: Date.now() - 86400000 * 90 },
  txns: [
    { id: 'a1', type: 'expense', amount: 32.5, category: 'food', note: '旧数据-午饭', date: '2026-10-30', createdAt: Date.now() - 9000000 },
    { id: 'a2', type: 'expense', amount: 3200, category: 'housing', note: '旧数据-房租', date: '2026-10-01', createdAt: Date.now() - 8000000 },
    { id: 'a3', type: 'income', amount: 12000, category: 'salary', note: '旧数据-工资', date: '2026-10-15', createdAt: Date.now() - 7000000 },
    { id: 'a4', type: 'expense', amount: 88, category: 'shopping', note: '旧数据-超市', date: '2026-10-20', createdAt: Date.now() - 6000000 },
  ],
};

await page.evaluate((data) => {
  localStorage.setItem('qingzhang.v1', JSON.stringify(data));
}, v1);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

check('迁移后直接进主页（账号保留）', await page.locator('.hero-amount').isVisible());

const accounts = await page.locator('.account-card:not(.is-add)').count();
check('自动补齐 3 个账户', accounts === 3, `count=${accounts}`);

const state = await page.evaluate(() => JSON.parse(localStorage.getItem('qingzhang.v1')));
check('版本号升到 2', state.version === 2, `version=${state.version}`);
check('所有流水补上 accountId', state.txns.every((t) => !!t.accountId), String(state.txns.length));

// 分类归属：房租/工资应挂银行卡，餐饮挂支付宝
const byNote = Object.fromEntries(state.txns.map((t) => [t.note, t.accountId]));
check('房租归到银行卡', byNote['旧数据-房租'] === 'acc-bank', byNote['旧数据-房租']);
check('餐饮归到支付宝', byNote['旧数据-午饭'] === 'acc-alipay', byNote['旧数据-午饭']);

// 数据完整性：金额总和不变
const sumV1 = v1.txns.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
const heroText = await page.locator('.hero-amount').innerText();
const heroVal = Number(heroText.replace(/[^\d]/g, ''));
check('本月支出金额一致', Math.abs(heroVal - Math.round(sumV1)) <= 1, `hero=${heroVal} v1=${sumV1}`);

await page.goto(BASE + '#/txns', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const rows = await page.locator('.txn-row').count();
check('流水数量未丢失', rows === 4, `rows=${rows}`);

const subs = await page.locator('.txn-sub').allInnerTexts();
check('旧流水能显示账户名', subs.every((s) => s.includes('·')), subs.join(' | '));

check('无 JS 报错', errors.length === 0, errors.join(' | ').slice(0, 200));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
