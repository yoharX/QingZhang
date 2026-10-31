import type { Account, PersistedState, Txn } from './types';
import { buildSeedAccounts, buildSeedTransactions } from './seed';

const KEY = 'qingzhang.v1';
const VERSION = 2;

const EMPTY: PersistedState = { version: VERSION, user: null, accounts: [], txns: [] };

/** 老数据没有 accountId，按分类归到最合理的账户 */
const BANK_CATEGORIES = new Set(['housing', 'salary', 'travel', 'digital', 'utility', 'invest', 'bonus']);

function inferAccountId(t: Partial<Txn>, accounts: Account[]): string {
  const bank = accounts.find((a) => a.type === 'bank');
  const alipay = accounts.find((a) => a.type === 'alipay');
  const wantBank = BANK_CATEGORIES.has(t.category ?? '');
  return (wantBank ? bank?.id : alipay?.id) ?? accounts[0]?.id ?? '';
}

export function load(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.txns)) {
      return { ...EMPTY };
    }

    let accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
    let txns = parsed.txns as Txn[];

    // v1 → v2：补账户、给流水补 accountId
    if (accounts.length === 0) {
      accounts = buildSeedAccounts();
      txns = txns.map((t) => ({ ...t, accountId: t.accountId || inferAccountId(t, accounts) }));
    } else if (txns.some((t) => !t.accountId)) {
      txns = txns.map((t) => ({
        ...t,
        accountId: t.accountId || inferAccountId(t, accounts),
      }));
    }

    return { version: VERSION, user: parsed.user ?? null, accounts, txns };
  } catch {
    // 存储损坏时不让页面白屏，退化成空状态
    return { ...EMPTY };
  }
}

export function save(state: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, version: VERSION }));
  } catch (err) {
    console.warn('[轻帐] 本地存储写入失败，可能已超出配额', err);
  }
}

export function clearAll(): void {
  localStorage.removeItem(KEY);
}

/** 导出为 JSON 备份，前端直接下载 */
export function exportJSON(state: PersistedState): void {
  const blob = new Blob([JSON.stringify({ ...state, version: VERSION }, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `轻帐-备份-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 导出 CSV，Excel / 数字都能直接打开 */
export function exportCSV(
  txns: {
    date: string;
    type: string;
    category: string;
    note: string;
    amount: number;
    account: string;
  }[]
): void {
  const head = '日期,类型,分类,账户,备注,金额\n';
  const body = txns
    .map((t) =>
      [
        t.date,
        t.type === 'expense' ? '支出' : '收入',
        t.category,
        `"${(t.account || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
      ].join(',')
    )
    .join('\n');
  // BOM 保证 Excel 打开中文不乱码
  const blob = new Blob(['\uFEFF' + head + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `轻帐-流水-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function seedAll(): { accounts: Account[]; txns: Txn[] } {
  const accounts = buildSeedAccounts();
  // buildSeedTransactions 会反算 openingBalance，所以必须先跑它再返回
  const txns = buildSeedTransactions(accounts);
  return { accounts, txns };
}
