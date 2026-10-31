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
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));

await page.goto(BASE, { waitUntil: 'networkidle' });

// 1. 登录
await page.getByText('用演示账号进去看看').click();
await page.waitForTimeout(1600);
check('演示账号登录', await page.locator('.hero-amount').isVisible());

// 2. 账户区渲染
const accCards = await page.locator('.account-card:not(.is-add)').count();
check('主页显示 3 个账户', accCards === 3, `count=${accCards}`);
const totalText = await page.locator('.accounts-total b').innerText();
check('总资产已计算', /¥/.test(totalText), totalText);

// 3. 记一笔 → 保存动效
await page.getByRole('button', { name: '记一笔' }).first().click();
await page.waitForTimeout(500);
await page.locator('.amount-input').fill('88.5');
await page.locator('#composer-note').fill('动画测试');
// 切到微信账户
await page.locator('.acc-chip', { hasText: '微信' }).click();
await page.getByRole('button', { name: '保存', exact: true }).click();

await page.waitForTimeout(300);
const cardIn = await page.locator('.flow-check-card').isVisible();
check('对勾卡片弹出', cardIn);

await page.waitForTimeout(800);
const dashOffset = await page
  .locator('.check-mark')
  .evaluate((el) => getComputedStyle(el).strokeDashoffset);
check('对勾绘制完成', parseFloat(dashOffset) < 1, `offset=${dashOffset}`);

await page.waitForTimeout(900);
const receiptIn = await page.locator('.receipt').isVisible();
check('回执卡片弹出', receiptIn);

const receiptAmount = await page.locator('.receipt-amount').innerText();
check('回执金额正确', receiptAmount.includes('88.50'), receiptAmount);

const balanceAfter = await page.locator('.rb-flow strong').innerText();
check('回执显示账户余额', /¥/.test(balanceAfter), balanceAfter);

await page.getByRole('button', { name: '完成' }).click();
await page.waitForTimeout(500);
check('回执关闭', (await page.locator('.receipt').count()) === 0);

// 4. 记录落到列表
const firstRow = await page.locator('.txn-row').first().innerText();
check('新记录出现在最近记录', firstRow.includes('动画测试'), firstRow.replace(/\n/g, ' | '));

// 5. 账户余额扣减
const wechatCard = page.locator('.account-card', { hasText: '微信' });
const wechatBal = await wechatCard.locator('.acc-bal').innerText();
check('微信余额已扣减', wechatBal.includes('1,374.30'), wechatBal);

// 6. 流水页显示账户
await page.goto(BASE + '#/txns', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const sub = await page.locator('.txn-row .txn-sub').first().innerText();
check('流水行显示分类与账户', sub.includes('·') && sub.includes('微信'), sub);

// 7. 新增账户（自定义银行卡）
await page.goto(BASE + '#/me', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.getByRole('button', { name: '新增' }).click();
await page.waitForTimeout(400);
await page.locator('.acc-type-cell', { hasText: '银行卡' }).click();
await page.waitForTimeout(200);
await page.locator('#acc-name').fill('宁波银行 尾号 8899');
await page.locator('#acc-balance').fill('5000');
await page.getByRole('button', { name: '保存', exact: true }).click();
await page.waitForTimeout(700);
const accCount = await page.locator('.setting-row .setting-title').allInnerTexts();
check('新增账户成功', accCount.includes('宁波银行 尾号 8899'), accCount.join(' / '));

// 8. 编辑余额（反推期初，不动流水）
const rowsBefore = await page.locator('.setting-row').count();
await page.locator('.setting-row', { hasText: '宁波银行' }).click();
await page.waitForTimeout(400);
await page.locator('#acc-balance').fill('4999');
await page.getByRole('button', { name: '保存', exact: true }).click();
await page.waitForTimeout(600);
const nbRow = page.locator('.setting-row', { hasText: '宁波银行' });
const nbBal = await nbRow.locator('.setting-value').innerText();
check('余额修改生效', nbBal.replace(/[^\d.]/g, '') === '4999.00', nbBal);

// 9. 删除账户，流水迁移
await page.locator('.setting-row', { hasText: '宁波银行' }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: '删除', exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: '确认删除' }).click();
await page.waitForTimeout(600);
const afterDelete = await page.locator('.setting-row .setting-title').allInnerTexts();
check('账户已删除', !afterDelete.includes('宁波银行 尾号 8899'), afterDelete.join(' / '));
check(
  '其它设置行未受连带影响',
  (await page.locator('.setting-row').count()) === rowsBefore - 1,
  `${rowsBefore} → ${await page.locator('.setting-row').count()}`
);

// 10. 刷新持久化
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
check('刷新后账户仍在', (await page.locator('.setting-row', { hasText: '微信' }).count()) === 1);

check('无 JS 报错', errors.length === 0, errors.join(' | ').slice(0, 300));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
