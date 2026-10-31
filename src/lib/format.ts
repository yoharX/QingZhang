/** 金额格式化：¥1,234.00；紧凑模式用于卡片大字 ¥1.2万 */
export function money(n: number, opts: { sign?: boolean; compact?: boolean } = {}): string {
  const { sign = false, compact = false } = opts;
  const abs = Math.abs(n);
  const prefix = sign ? (n > 0 ? '+' : n < 0 ? '−' : '') : n < 0 ? '−' : '';

  if (compact && abs >= 10000) {
    const w = abs / 10000;
    return `${prefix}¥${w >= 100 ? w.toFixed(0) : w.toFixed(1)}万`;
  }
  return prefix + '¥' + abs.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 不带小数的整数金额，用于概览大数字 */
export function moneyRound(n: number): string {
  const abs = Math.abs(n);
  const prefix = n < 0 ? '−' : '';
  return prefix + '¥' + Math.round(abs).toLocaleString('zh-CN');
}

export function percent(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

/* ---------------- 日期：全部按本地时区处理，避免 UTC 漂移 ---------------- */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 该月第一天 / 最后一天 */
export function monthBounds(ref: Date): { start: string; end: string; days: number } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${y}-${pad(m + 1)}-01`,
    end: `${y}-${pad(m + 1)}-${pad(last)}`,
    days: last,
  };
}

export function monthKey(ref: Date): string {
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(ref: Date, delta: number): Date {
  return new Date(ref.getFullYear(), ref.getMonth() + delta, 1);
}

export function inRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

/** 10-31 → 10月31日；跨年时带年份 */
export function formatDateCN(dateStr: string, withYear = false): string {
  const d = parseDate(dateStr);
  const now = new Date();
  const base = `${d.getMonth() + 1}月${d.getDate()}日`;
  if (withYear || d.getFullYear() !== now.getFullYear()) {
    return `${d.getFullYear()}年${base}`;
  }
  return base;
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function weekdayCN(dateStr: string): string {
  return WEEK[parseDate(dateStr).getDay()];
}

/** 今天 / 昨天 / 10月29日 周三 */
export function relativeDay(dateStr: string): string {
  const today = toISODate(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = toISODate(y);
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  return `${formatDateCN(dateStr)} ${weekdayCN(dateStr)}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export function todayLabel(): string {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEK[d.getDay()]}`;
}
