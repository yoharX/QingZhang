import type { Txn, TxnType } from './types';
import { getCategory } from './categories';
import { addMonths, inRange, monthBounds, monthKey, parseDate, toISODate } from './format';

export function sum(txns: Txn[], type: TxnType): number {
  return txns.reduce((acc, t) => (t.type === type ? acc + t.amount : acc), 0);
}

export function txnsInMonth(txns: Txn[], ref: Date): Txn[] {
  const { start, end } = monthBounds(ref);
  return txns.filter((t) => inRange(t.date, start, end));
}

export interface CategorySlice {
  key: string;
  label: string;
  value: number;
  share: number;
  color: string;
  count: number;
}

/** 按分类聚合，降序；O(n) */
export function byCategory(txns: Txn[], type: TxnType): CategorySlice[] {
  const list = txns.filter((t) => t.type === type);
  const total = list.reduce((a, t) => a + t.amount, 0);
  const map = new Map<string, { value: number; count: number }>();
  for (const t of list) {
    const cur = map.get(t.category) ?? { value: 0, count: 0 };
    cur.value += t.amount;
    cur.count += 1;
    map.set(t.category, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => {
      const def = getCategory(key);
      return {
        key,
        label: def.label,
        value: v.value,
        count: v.count,
        share: total > 0 ? v.value / total : 0,
        color: def.color,
      };
    })
    .sort((a, b) => b.value - a.value);
}

export interface DayPoint {
  date: string;
  label: string;
  expense: number;
  income: number;
}

/** 逐日序列：用于本周柱状 / 本月曲线 */
export function dailySeries(txns: Txn[], ref: Date): DayPoint[] {
  const { days } = monthBounds(ref);
  const arr: DayPoint[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(ref.getFullYear(), ref.getMonth(), i + 1);
    return { date: toISODate(d), label: String(i + 1), expense: 0, income: 0 };
  });
  const idx = new Map(arr.map((p, i) => [p.date, i]));
  for (const t of txns) {
    const i = idx.get(t.date);
    if (i === undefined) continue;
    if (t.type === 'expense') arr[i].expense += t.amount;
    else arr[i].income += t.amount;
  }
  return arr;
}

/** 最近 n 天，用于主页"近 7 天" */
export function lastNDays(txns: Txn[], n: number): DayPoint[] {
  const out: DayPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toISODate(d);
    out.push({
      date: key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      expense: 0,
      income: 0,
    });
  }
  const idx = new Map(out.map((p, i) => [p.date, i]));
  for (const t of txns) {
    const i = idx.get(t.date);
    if (i === undefined) continue;
    if (t.type === 'expense') out[i].expense += t.amount;
    else out[i].income += t.amount;
  }
  return out;
}

export interface MonthPoint {
  key: string;
  label: string;
  expense: number;
  income: number;
}

/** 近 n 个月的收支合计，用于趋势图 */
export function monthlySeries(txns: Txn[], n: number): MonthPoint[] {
  const now = new Date();
  const out: MonthPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addMonths(now, -i);
    const list = txnsInMonth(txns, d);
    out.push({
      key: monthKey(d),
      label: `${d.getMonth() + 1}月`,
      expense: sum(list, 'expense'),
      income: sum(list, 'income'),
    });
  }
  return out;
}

/** 环比：本期 vs 上期，返回增长率（上期为 0 时返回 null） */
export function growth(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

/** 按日期分组，用于流水列表 */
export interface DayGroup {
  date: string;
  items: Txn[];
  expense: number;
  income: number;
}

export function groupByDay(txns: Txn[]): DayGroup[] {
  const map = new Map<string, Txn[]>();
  for (const t of txns) {
    const arr = map.get(t.date) ?? [];
    arr.push(t);
    map.set(t.date, arr);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => b.createdAt - a.createdAt),
      expense: sum(items, 'expense'),
      income: sum(items, 'income'),
    }));
}

/** 储蓄率 = (收入 - 支出) / 收入；无收入返回 null */
export function savingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return (income - expense) / income;
}

/** 消费分散度（香农熵归一化）：越接近 1 越分散 */
export function diversityIndex(slices: CategorySlice[]): number {
  const valid = slices.filter((s) => s.value > 0);
  if (valid.length <= 1) return 0;
  const h = -valid.reduce((acc, s) => acc + s.share * Math.log(s.share), 0);
  return h / Math.log(valid.length);
}

/** 本月已过天数占比，用于预算进度对照 */
export function monthProgress(ref: Date): number {
  const { days } = monthBounds(ref);
  const isCurrent =
    ref.getFullYear() === new Date().getFullYear() && ref.getMonth() === new Date().getMonth();
  const passed = isCurrent ? new Date().getDate() : days;
  return passed / days;
}

export function parseOrNull(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = parseDate(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
