import type { Account, Txn } from './types';
import { addMonths, toISODate } from './format';

/** 确定性伪随机，保证每次生成同一份示例数据，刷新不会跳变 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FOOD_NOTES = ['楼下面馆', '便利店', '公司食堂', '米线外卖', '咖啡', '火锅', '日料', '早餐铺', '奶茶', '烧烤'];
const GROCERY_NOTES = ['菜市场', '永辉超市', '盒马', '水果店', '叮咚买菜'];
const RIDE_NOTES = ['地铁', '打车', '公交', '共享单车', '高铁'];
const SHOP_NOTES = ['超市采购', '日用品', '洗发水', '收纳盒', '家居'];
const CLOTHING_NOTES = ['优衣库', '鞋子', '外套', '袜子', 'T恤'];
const FUN_NOTES = ['电影票', '演出', '游戏', 'KTV', '桌游'];
const HEALTH_NOTES = ['感冒药', '牙科', '体检', '眼药水'];
const STUDY_NOTES = ['书', '网课', '考试报名'];
const DIGITAL_NOTES = ['耳机', '充电器', '硬盘', '键盘'];
const SOCIAL_NOTES = ['同事结婚', '生日礼物', '请客吃饭'];
const FITNESS_NOTES = ['健身房', '泳池', '跑鞋'];
const TRAVEL_NOTES = ['机票', '酒店', '门票', '民宿'];
const SUB_NOTES = ['视频会员', '云存储', '音乐会员'];

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

/** 三个默认账户：支付宝 / 微信 / 招行储蓄卡 */
export function buildSeedAccounts(): Account[] {
  const t = Date.now();
  return [
    { id: 'acc-alipay', type: 'alipay', name: '支付宝', openingBalance: 2600, createdAt: t },
    { id: 'acc-wechat', type: 'wechat', name: '微信', openingBalance: 900, createdAt: t },
    {
      id: 'acc-bank',
      type: 'bank',
      name: '招商银行',
      bankCode: 'cmb',
      openingBalance: 4200,
      createdAt: t,
    },
  ];
}

/**
 * 生成 6 个月示例流水（含本月至今）。
 * 账户分配按生活常识：工资、房租、机票走银行卡，日常小额走支付宝/微信。
 */
export function buildSeedTransactions(accounts: Account[]): Txn[] {
  const rnd = mulberry32(20261031);
  const out: Txn[] = [];
  const today = new Date();
  let seq = 0;

  const ALIPAY = accounts.find((a) => a.type === 'alipay')?.id ?? accounts[0]?.id ?? '';
  const WECHAT = accounts.find((a) => a.type === 'wechat')?.id ?? ALIPAY;
  const BANK = accounts.find((a) => a.type === 'bank')?.id ?? ALIPAY;

  const push = (
    date: Date,
    type: Txn['type'],
    amount: number,
    category: string,
    note: string,
    accountId: string
  ) => {
    out.push({
      id: `seed-${seq++}`,
      type,
      amount: Math.round(amount * 100) / 100,
      category,
      note,
      date: toISODate(date),
      accountId,
      createdAt: date.getTime() + seq,
    });
  };

  // 小额日常随机落到支付宝 / 微信 / 银行卡
  const daily = () => {
    const r = rnd();
    if (r < 0.5) return ALIPAY;
    if (r < 0.85) return WECHAT;
    return BANK;
  };

  // 生成 6 个月：趋势图要看得出走势
  for (let back = 5; back >= 0; back--) {
    const base = addMonths(today, -back);
    const y = base.getFullYear();
    const m = base.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const lastDay = back === 0 ? today.getDate() : daysInMonth;

    // 固定项：房租走银行卡，工资进银行卡
    push(new Date(y, m, 1), 'expense', 3200, 'housing', '房租', BANK);
    push(new Date(y, m, Math.min(15, lastDay)), 'income', 12800, 'salary', '工资', BANK);
    if (lastDay >= 10) push(new Date(y, m, 10), 'income', 860, 'invest', '基金分红', BANK);
    if (lastDay >= 8) push(new Date(y, m, 8), 'expense', 268, 'utility', '水电燃气', BANK);
    if (lastDay >= 12) push(new Date(y, m, 12), 'expense', 128, 'telecom', '手机套餐', ALIPAY);
    if (lastDay >= 20) push(new Date(y, m, 20), 'expense', 25, 'subscription', pick(rnd, SUB_NOTES), ALIPAY);

    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(y, m, d);
      const dow = date.getDay();
      const weekend = dow === 0 || dow === 6;

      // 三餐
      const meals = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < meals; i++) {
        push(date, 'expense', 12 + rnd() * 68, 'food', pick(rnd, FOOD_NOTES), daily());
      }

      // 买菜：每周一两次
      if (rnd() < 0.28) {
        push(date, 'expense', 30 + rnd() * 140, 'grocery', pick(rnd, GROCERY_NOTES), daily());
      }

      // 工作日通勤
      if (dow >= 1 && dow <= 5 && rnd() < 0.78) {
        push(date, 'expense', 4 + rnd() * 26, 'transport', pick(rnd, RIDE_NOTES), daily());
      }

      // 周末娱乐 / 购物概率更高
      if (rnd() < (weekend ? 0.4 : 0.1)) {
        push(date, 'expense', 40 + rnd() * 260, 'shopping', pick(rnd, SHOP_NOTES), daily());
      }
      if (rnd() < (weekend ? 0.26 : 0.05)) {
        push(date, 'expense', 60 + rnd() * 300, 'clothing', pick(rnd, CLOTHING_NOTES), daily());
      }
      if (rnd() < (weekend ? 0.32 : 0.06)) {
        push(date, 'expense', 30 + rnd() * 160, 'fun', pick(rnd, FUN_NOTES), daily());
      }

      // 低频项
      if (rnd() < 0.05) push(date, 'expense', 20 + rnd() * 220, 'health', pick(rnd, HEALTH_NOTES), daily());
      if (rnd() < 0.06) push(date, 'expense', 25 + rnd() * 150, 'study', pick(rnd, STUDY_NOTES), daily());
      if (rnd() < 0.03) push(date, 'expense', 80 + rnd() * 400, 'digital', pick(rnd, DIGITAL_NOTES), daily());
      if (rnd() < 0.03) push(date, 'expense', 50 + rnd() * 300, 'social', pick(rnd, SOCIAL_NOTES), daily());
      if (rnd() < 0.04) push(date, 'expense', 30 + rnd() * 120, 'fitness', pick(rnd, FITNESS_NOTES), daily());
      if (rnd() < 0.02) push(date, 'expense', 20 + rnd() * 90, 'pet', '猫粮', ALIPAY);
      if (rnd() < 0.008 && back !== 5) {
        push(date, 'expense', 600 + rnd() * 1800, 'travel', pick(rnd, TRAVEL_NOTES), BANK);
      }

      if (rnd() < 0.03) push(date, 'income', 20 + rnd() * 200, 'gift', '红包', WECHAT);
      if (rnd() < 0.02) push(date, 'income', 80 + rnd() * 600, 'side', '兼职', ALIPAY);
      if (rnd() < 0.012) push(date, 'income', 30 + rnd() * 260, 'refund', '退款', ALIPAY);
    }
  }

  // 越新的排前面
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));

  // 反算期初余额：让「当前余额」落在预设的合理值上。
  // 否则 6 个月的小额支出全压在支付宝/微信上，会算出几万块的负数。
  const TARGETS: Record<string, number> = {
    'acc-alipay': 3280.5,
    'acc-wechat': 1462.8,
    'acc-bank': 26890,
  };
  for (const acc of accounts) {
    const net = out.reduce(
      (sum, t) =>
        t.accountId === acc.id ? sum + (t.type === 'income' ? t.amount : -t.amount) : sum,
      0
    );
    const target = TARGETS[acc.id] ?? 1200;
    acc.openingBalance = Math.round((target - net) * 100) / 100;
  }

  return out;
}
