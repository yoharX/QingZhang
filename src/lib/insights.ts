import type { Txn } from './types';
import { getCategory } from './categories';
import { money } from './format';
import {
  byCategory,
  diversityIndex,
  growth,
  monthProgress,
  savingsRate,
  sum,
  txnsInMonth,
} from './stats';

export type InsightTone = 'warn' | 'good' | 'info';

export interface Insight {
  id: string;
  tone: InsightTone;
  tag: string;
  title: string;
  body: string;
  /** 卡片右侧的主指标，纯展示 */
  metric?: { label: string; value: string };
}

export interface BudgetView {
  budget: number;
  spent: number;
  /** 0~1+ 的消耗比 */
  ratio: number;
  /** 时间进度 0~1 */
  timeRatio: number;
  /** 按当前速度预测的月末支出 */
  forecast: number;
  remaining: number;
}

export interface HealthScore {
  total: number;
  saving: number;
  budget: number;
  diversity: number;
  habit: number;
  level: string;
}

export interface AnalysisResult {
  monthExpense: number;
  monthIncome: number;
  prevExpense: number;
  prevIncome: number;
  expenseGrowth: number | null;
  incomeGrowth: number | null;
  slices: ReturnType<typeof byCategory>;
  insights: Insight[];
  budget: BudgetView | null;
  health: HealthScore;
  /** 一句话总结，主卡片展示 */
  headline: string;
  /** 更长的解读段落 */
  narrative: string;
  recordedDays: number;
  totalDays: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * 本地分析引擎：全部指标从流水现算，不调用任何远程接口。
 * 复杂度 O(n)，n = 交易条数。
 */
export function analyze(txns: Txn[], budget: number): AnalysisResult {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const cur = txnsInMonth(txns, now);
  const last = txnsInMonth(txns, prev);

  const monthExpense = sum(cur, 'expense');
  const monthIncome = sum(cur, 'income');
  const prevExpense = sum(last, 'expense');
  const prevIncome = sum(last, 'income');

  const expenseGrowth = growth(monthExpense, prevExpense);
  const incomeGrowth = growth(monthIncome, prevIncome);

  const slices = byCategory(cur, 'expense');
  const prevSlices = byCategory(last, 'expense');

  const timeRatio = monthProgress(now);
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const recordedDays = new Set(cur.map((t) => t.date)).size;

  /* ---------- 预算 ---------- */
  let budgetView: BudgetView | null = null;
  if (budget > 0) {
    const ratio = monthExpense / budget;
    const forecast = timeRatio > 0 ? monthExpense / timeRatio : monthExpense;
    budgetView = {
      budget,
      spent: monthExpense,
      ratio,
      timeRatio,
      forecast,
      remaining: budget - monthExpense,
    };
  }

  /* ---------- 洞察 ---------- */
  const insights: Insight[] = [];

  // 1. 总支出环比
  if (expenseGrowth !== null && prevExpense > 0) {
    const up = expenseGrowth > 0;
    const pct = Math.abs(expenseGrowth);
    if (pct >= 0.12) {
      insights.push({
        id: 'mom',
        tone: up ? 'warn' : 'good',
        tag: '环比',
        title: up
          ? `本月比上月多花了 ${(pct * 100).toFixed(0)}%`
          : `本月比上月省了 ${(pct * 100).toFixed(0)}%`,
        body: up
          ? `上月同期 ${money(prevExpense)}，本月 ${money(monthExpense)}，差 ${money(
              monthExpense - prevExpense
            )}。`
          : `上月 ${money(prevExpense)}，本月 ${money(monthExpense)}，少花 ${money(
              prevExpense - monthExpense
            )}。`,
        metric: { label: '本月支出', value: money(monthExpense) },
      });
    }
  }

  // 2. 增长最快的分类（要求有量级，避免 5 块钱变 30 块的噪声）
  let fastest: { label: string; delta: number; cur: number; prev: number } | null = null;
  for (const s of slices) {
    const p = prevSlices.find((x) => x.key === s.key);
    const prevVal = p?.value ?? 0;
    const delta = s.value - prevVal;
    if (s.value < 120 || delta < 80) continue;
    if (!fastest || delta > fastest.delta) {
      fastest = { label: s.label, delta, cur: s.value, prev: prevVal };
    }
  }
  if (fastest) {
    insights.push({
      id: 'fastest',
      tone: 'warn',
      tag: '结构变化',
      title: `${fastest.label}是本月增长最多的一项`,
      body:
        fastest.prev > 0
          ? `上月 ${money(fastest.prev)} → 本月 ${money(fastest.cur)}，多了 ${money(
              fastest.delta
            )}。`
          : `上月几乎没有${fastest.label}支出，本月到了 ${money(fastest.cur)}。`,
      metric: { label: fastest.label, value: money(fastest.cur) },
    });
  }

  // 3. 最大分类占比
  if (slices.length > 0) {
    const top = slices[0];
    if (top.share >= 0.25) {
      insights.push({
        id: 'top',
        tone: 'info',
        tag: '消费结构',
        title: `${top.label}占了支出的 ${(top.share * 100).toFixed(0)}%`,
        body:
          top.count > 1
            ? `共 ${top.count} 笔，合计 ${money(top.value)}，平均每笔 ${money(
                top.value / top.count
              )}。`
            : `这一类只记了 1 笔，金额 ${money(top.value)}，属于一次性的大额。`,
        metric: { label: '笔数', value: String(top.count) },
      });
    }
  }

  // 4. 预算执行
  if (budgetView) {
    const overPace = budgetView.ratio > budgetView.timeRatio + 0.08;
    const willOver = budgetView.forecast > budgetView.budget;
    const monthEnded = budgetView.timeRatio >= 0.97;
    if (overPace || willOver) {
      insights.push({
        id: 'budget',
        tone: 'warn',
        tag: '预算',
        title: willOver
          ? monthEnded
            ? `这个月超预算 ${money(budgetView.forecast - budgetView.budget)}`
            : `按现在的速度，这个月会超预算 ${money(budgetView.forecast - budgetView.budget)}`
          : '花得比时间快一点',
        body: `已用 ${money(budgetView.spent)} / ${money(budgetView.budget)}（${(
          budgetView.ratio * 100
        ).toFixed(0)}%），而本月已过 ${(budgetView.timeRatio * 100).toFixed(0)}%。`,
        metric: { label: '剩余', value: money(Math.max(0, budgetView.remaining)) },
      });
    } else {
      insights.push({
        id: 'budget-ok',
        tone: 'good',
        tag: '预算',
        title: '预算节奏正常',
        body: `已用 ${(budgetView.ratio * 100).toFixed(0)}%，时间走了 ${(
          budgetView.timeRatio * 100
        ).toFixed(0)}%，还剩 ${money(budgetView.remaining)} 可以花。`,
        metric: { label: '剩余', value: money(Math.max(0, budgetView.remaining)) },
      });
    }
  }

  // 5. 储蓄率
  const rate = savingsRate(monthIncome, monthExpense);
  if (rate !== null) {
    insights.push({
      id: 'saving',
      tone: rate >= 0.2 ? 'good' : rate >= 0 ? 'info' : 'warn',
      tag: '结余',
      title:
        rate >= 0.3
          ? `存下了收入的 ${(rate * 100).toFixed(0)}%，很稳`
          : rate >= 0
          ? `结余率 ${(rate * 100).toFixed(0)}%，还有空间`
          : '这个月支出超过了收入',
      body: `收入 ${money(monthIncome)}，支出 ${money(monthExpense)}，结余 ${money(
        monthIncome - monthExpense
      )}。`,
      metric: { label: '结余率', value: `${(rate * 100).toFixed(0)}%` },
    });
  }

  // 6. 小额高频（拿铁因子）
  const food = slices.find((s) => s.key === 'food');
  if (food && food.count >= 12) {
    const avg = food.value / food.count;
    insights.push({
      id: 'small',
      tone: 'info',
      tag: '习惯',
      title: '小额高频是最大的一笔隐形开销',
      body: `餐饮 ${food.count} 笔，平均 ${money(avg)} 一笔，加起来 ${money(
        food.value
      )}，占了本月支出的 ${(food.share * 100).toFixed(0)}%。单笔不起眼，累计起来比很多大项都多。`,
      metric: { label: '占比', value: `${(food.share * 100).toFixed(0)}%` },
    });
  }

  // 7. 记账连续性
  if (recordedDays > 0) {
    const ratio = recordedDays / Math.min(new Date().getDate(), totalDays);
    if (ratio >= 0.8) {
      insights.push({
        id: 'habit',
        tone: 'good',
        tag: '习惯',
        title: '记录很完整',
        body: `本月有 ${recordedDays} 天留下了记录，覆盖率 ${(ratio * 100).toFixed(
          0
        )}%。数据越全，判断越准。`,
        metric: { label: '天数', value: `${recordedDays}天` },
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: 'empty',
      tone: 'info',
      tag: '开始',
      title: '记满一周再来看看',
      body: '记录几笔之后，这里会告诉你钱花在了哪、和上个月比变化多少。',
    });
  }

  /* ---------- 健康分 ---------- */
  const savingScore = rate === null ? 12 : clamp01(rate / 0.3) * 40;
  let budgetScore = 18;
  if (budgetView) {
    const over = budgetView.ratio - budgetView.timeRatio;
    budgetScore = clamp01(1 - Math.max(0, over) * 2.2) * 30;
  }
  const diversityScore = diversityIndex(slices) * 15;
  const habitScore = clamp01(recordedDays / Math.max(1, new Date().getDate())) * 15;
  const total = Math.round(savingScore + budgetScore + diversityScore + habitScore);

  const health: HealthScore = {
    total,
    saving: Math.round(savingScore),
    budget: Math.round(budgetScore),
    diversity: Math.round(diversityScore),
    habit: Math.round(habitScore),
    level: total >= 85 ? '稳健' : total >= 70 ? '良好' : total >= 55 ? '一般' : '需要关注',
  };

  /* ---------- 文案 ---------- */
  const topLabel = slices[0]?.label ?? '—';
  const headline =
    monthExpense === 0
      ? '这个月还没有支出记录'
      : `本月花掉 ${money(monthExpense)}，其中${topLabel}最多${
          budgetView
            ? budgetView.ratio > budgetView.timeRatio + 0.08
              ? '，节奏比预算稍快'
              : '，整体在预算内'
            : ''
        }。`;

  const parts: string[] = [];
  parts.push(`本月支出 ${money(monthExpense)}，收入 ${money(monthIncome)}。`);
  if (expenseGrowth !== null) {
    parts.push(
      expenseGrowth >= 0
        ? `相比上月同期上升 ${(expenseGrowth * 100).toFixed(0)}%。`
        : `相比上月同期下降 ${(-expenseGrowth * 100).toFixed(0)}%。`
    );
  }
  if (budgetView) {
    parts.push(
      `预算 ${money(budgetView.budget)} 已用 ${(budgetView.ratio * 100).toFixed(0)}%，` +
        `按当前速度月末大约 ${money(budgetView.forecast)}。`
    );
  }
  if (slices.length >= 2) {
    parts.push(
      `前三大类依次是 ${slices
        .slice(0, 3)
        .map((s) => `${s.label} ${(s.share * 100).toFixed(0)}%`)
        .join('、')}。`
    );
  }
  const narrative = parts.join('');

  return {
    monthExpense,
    monthIncome,
    prevExpense,
    prevIncome,
    expenseGrowth,
    incomeGrowth,
    slices,
    insights,
    budget: budgetView,
    health,
    headline,
    narrative,
    recordedDays,
    totalDays,
  };
}

export function categoryShareText(txns: Txn[], key: string): string {
  const cur = txnsInMonth(txns, new Date());
  const total = sum(cur, 'expense');
  const val = cur
    .filter((t) => t.category === key && t.type === 'expense')
    .reduce((a, t) => a + t.amount, 0);
  if (total <= 0) return '—';
  return `${((val / total) * 100).toFixed(0)}% ${getCategory(key).label}`;
}
