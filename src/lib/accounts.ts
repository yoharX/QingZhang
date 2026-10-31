import type { Account, AccountType, Txn } from './types';

export interface AccountTypeDef {
  key: AccountType;
  label: string;
  hint: string;
  color: string;
  soft: string;
}

/** 账户类型是数据字典，加一种只需在这里加一行 + 一个图标 */
export const ACCOUNT_TYPES: AccountTypeDef[] = [
  { key: 'alipay', label: '支付宝', hint: '余额 / 余额宝', color: 'var(--c1)', soft: 'var(--brand-soft)' },
  { key: 'wechat', label: '微信', hint: '零钱 / 零钱通', color: 'var(--c2)', soft: '#e6f6fb' },
  { key: 'bank', label: '银行卡', hint: '储蓄卡 / 信用卡', color: 'var(--c7)', soft: '#eef3f5' },
  { key: 'cash', label: '现金', hint: '随身现金', color: 'var(--c4)', soft: 'var(--expense-soft)' },
];

const TYPE_MAP = new Map(ACCOUNT_TYPES.map((t) => [t.key, t]));

export function getAccountType(key: AccountType): AccountTypeDef {
  return TYPE_MAP.get(key) ?? ACCOUNT_TYPES[0];
}

/** 常见银行，用于开户时快速选择；也可自行填写 */
export const BANKS: { code: string; name: string; short: string }[] = [
  { code: 'cmb', name: '招商银行', short: '招行' },
  { code: 'icbc', name: '工商银行', short: '工行' },
  { code: 'ccb', name: '建设银行', short: '建行' },
  { code: 'abc', name: '农业银行', short: '农行' },
  { code: 'boc', name: '中国银行', short: '中行' },
  { code: 'bocom', name: '交通银行', short: '交行' },
  { code: 'psbc', name: '邮储银行', short: '邮储' },
  { code: 'citic', name: '中信银行', short: '中信' },
  { code: 'spdb', name: '浦发银行', short: '浦发' },
  { code: 'cmbc', name: '民生银行', short: '民生' },
  { code: 'cib', name: '兴业银行', short: '兴业' },
  { code: 'ceb', name: '光大银行', short: '光大' },
  { code: 'pab', name: '平安银行', short: '平安' },
  { code: 'cgb', name: '广发银行', short: '广发' },
];

export function bankName(code?: string): string {
  return BANKS.find((b) => b.code === code)?.name ?? '银行卡';
}

/** 单个账户当前余额：期初 + 收入 − 支出。O(账户流水数) */
export function accountBalance(acc: Account, txns: Txn[]): number {
  let bal = acc.openingBalance;
  for (const t of txns) {
    if (t.accountId !== acc.id) continue;
    bal += t.type === 'income' ? t.amount : -t.amount;
  }
  return bal;
}

/** 一次算出所有账户余额，避免每个账户扫全表 */
export function balancesOf(accounts: Account[], txns: Txn[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const a of accounts) map[a.id] = a.openingBalance;
  for (const t of txns) {
    if (map[t.accountId] === undefined) continue;
    map[t.accountId] += t.type === 'income' ? t.amount : -t.amount;
  }
  return map;
}

export function totalBalance(accounts: Account[], balances: Record<string, number>): number {
  return accounts.reduce((sum, a) => sum + (balances[a.id] ?? 0), 0);
}

/** 某账户在某时点的净流水（用于把「当前余额」反推成期初） */
export function netOf(accountId: string, txns: Txn[]): number {
  return txns.reduce(
    (sum, t) =>
      t.accountId === accountId ? sum + (t.type === 'income' ? t.amount : -t.amount) : sum,
    0
  );
}
