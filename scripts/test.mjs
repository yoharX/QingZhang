import { chromium } from 'playwright-core';
import { homedir } from 'node:os';
import { join } from 'node:path';

const EXE = join(homedir(), 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const BASE = 'http://127.0.0.1:4173/';
const PROXY = 'http://127.0.0.1:59117';

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
};

const browser = await chromium.launch({
  executablePath: EXE,
  headless: true,
  proxy: { server: PROXY, bypass: '127.0.0.1,localhost' },
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 940 },
  ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGE: ' + e.message));
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' && !t.includes('429') && !t.includes('Failed to load resource')) {
    errors.push('CONSOLE: ' + t);
  }
});

await page.goto(BASE, { waitUntil: 'networkidle' });

// 1. 登录
await page.getByText('用演示账号进去看看').click();
await page.waitForTimeout(1800);
check('登录成功', await page.locator('.hero-amount').isVisible());

// 2. 天气
await page.waitForTimeout(6500);
const weatherText = await page.locator('.weather-card').innerText();
const hasTemp = /\d+°/.test(weatherText);
check('天气卡有温度数据', hasTemp, weatherText.replace(/\n/g, ' | ').slice(0, 80));

// 城市选择
await page.locator('.weather-city-btn').click();
await page.waitForTimeout(400);
const cityCount = await page.locator('.city-chip').count();
check('城市选择面板打开', cityCount > 10, `${cityCount} 个城市`);
await page.locator('.city-chip', { hasText: '杭州' }).click();
await page.waitForTimeout(3000);
const cityNow = await page.locator('.weather-city-btn').innerText();
check('切换城市生效', cityNow.includes('杭州'), cityNow);

// 3. 板块：隐藏一项
await page.getByRole('button', { name: '板块' }).click();
await page.waitForTimeout(500);
const rows = page.locator('.mod-row');
const beforeCount = await rows.count();
check('板块面板列出 6 项', beforeCount === 6, String(beforeCount));

await page.locator('.mod-row', { hasText: '近 7 天' }).locator('.switch').click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: '完成' }).click();
await page.waitForTimeout(500);
const hasWeek = await page.getByText('近 7 天').count();
check('隐藏后首页不再显示该板块', hasWeek === 0, `count=${hasWeek}`);

// 4. 板块：拖拽排序
await page.getByRole('button', { name: '板块' }).click();
await page.waitForTimeout(500);
const firstName = await page.locator('.mod-label').first().innerText();
const grip = page.locator('.mod-grip').first();
const box = await grip.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 150, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}
const firstNameAfter = await page.locator('.mod-label').first().innerText();
check('拖拽改变了顺序', firstName !== firstNameAfter, `${firstName} → ${firstNameAfter}`);

// 上移按钮兜底
const secondName = await page.locator('.mod-label').nth(1).innerText();
await page.locator('.mod-row').nth(1).locator('.mod-arrow').first().click();
await page.waitForTimeout(300);
const topName = await page.locator('.mod-label').first().innerText();
check('上移按钮生效', topName === secondName, `${secondName} → 第一位`);

await page.getByRole('button', { name: '完成' }).click();
await page.waitForTimeout(400);

// 5. AI 模式
await page.goto(BASE + '#/insights', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.getByRole('tab', { name: '大模型' }).click();
await page.waitForTimeout(900);
const aiModal = await page.getByText('AI 分析方式').count();
check('切大模型时自动弹出配置', aiModal > 0, `count=${aiModal}`);

// 关掉弹窗，主卡应给出未配置提示
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
const hint = await page.locator('.insight-headline').innerText();
check('未配置时给出提示', hint.includes('还没有配置'), hint);

// 点去配置能再次打开
await page.getByRole('button', { name: '去配置' }).click();
await page.waitForTimeout(700);
check('去配置按钮可用', (await page.getByText('AI 分析方式').count()) > 0);

// 切回本地
await page.getByRole('tab', { name: '本地规则' }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: '保存' }).click();
await page.waitForTimeout(800);

await page.goto(BASE + '#/insights', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const localCards = await page.locator('.insight-card').count();
check('本地分析有洞察卡', localCards > 0, `${localCards} 张`);

// 6. 改昵称
await page.goto(BASE + '#/me', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.locator('.profile-identity').click();
await page.waitForTimeout(500);
await page.locator('#profile-name').fill('阿岩');
await page.getByRole('button', { name: '保存' }).click();
await page.waitForTimeout(600);
const nameShown = await page.locator('.profile-name').innerText();
check('昵称已更新', nameShown === '阿岩', nameShown);

// 7. 换预设头像
await page.locator('.profile-identity').click();
await page.waitForTimeout(500);
await page.locator('.avatar-pick').nth(2).click();
await page.getByRole('button', { name: '保存' }).click();
await page.waitForTimeout(600);
const avatarClass = await page.locator('.profile-identity .avatar').getAttribute('class');
check('头像换成预设样式', avatarClass.includes('avatar-preset'), avatarClass);

// 持久化
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
check('刷新后昵称与头像保留', (await page.locator('.profile-name').innerText()) === '阿岩');

// 8. 首页问候用新昵称
await page.goto(BASE + '#/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const greeting = await page.locator('.page-title').innerText();
check('首页问候同步', greeting.includes('阿岩'), greeting);

// 9. 移动端溢出检查
const mctx = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const m = await mctx.newPage();
await m.goto(BASE, { waitUntil: 'networkidle' });
await m.waitForTimeout(1500);
// 新 context 没有登录态，先登进去再测布局
if ((await m.locator('.auth-title').count()) > 0) {
  await m.getByText('用演示账号进去看看').click();
  await m.waitForTimeout(2000);
}
check('移动端登录态建立', (await m.locator('.hero-amount').count()) > 0);
for (const route of ['/', '/txns', '/insights', '/me']) {
  await m.goto(BASE + '#' + route, { waitUntil: 'networkidle' });
  await m.waitForTimeout(1600);
  const o = await m.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  check(`375px 无横向溢出 ${route}`, o.sw <= o.cw, `${o.sw}/${o.cw}`);
}

// 输入框字号（iOS 不缩放要求 >= 16px）
await m.goto(BASE + '#/me', { waitUntil: 'networkidle' });
await m.waitForTimeout(800);
await m.locator('.profile-identity').click();
await m.waitForTimeout(500);
const inputFont = await m
  .locator('#profile-name')
  .evaluate((el) => getComputedStyle(el).fontSize);
check('移动端输入框 ≥16px', parseFloat(inputFont) >= 16, inputFont);
await m.keyboard.press('Escape');

// 10. 删除全部数据
await m.goto(BASE + '#/me', { waitUntil: 'networkidle' });
await m.waitForTimeout(800);
await m.getByRole('button', { name: '删除全部数据' }).click();
await m.waitForTimeout(500);
await m.getByRole('button', { name: '确认删除' }).click();
await m.waitForTimeout(1000);
const backToLogin = await m.locator('.auth-title').count();
check('删除后回到登录页', backToLogin > 0);
const ls = await m.evaluate(() => localStorage.getItem('qingzhang.v1'));
check('localStorage 已清空', ls === null, String(ls).slice(0, 40));

check('无 JS 报错', errors.length === 0, errors.join(' | ').slice(0, 260));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
