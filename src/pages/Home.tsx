import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { CategoryGlyph } from '../components/CategoryGlyph';
import { AccountGlyph } from '../components/AccountGlyph';
import { Bars, BudgetBar, Donut, MiniBars } from '../components/charts';
import { Icon } from '../components/Icon';
import { greeting, money, moneyRound, relativeDay, todayLabel } from '../lib/format';
import { balancesOf, getAccountType, totalBalance } from '../lib/accounts';
import {
  byCategory,
  dailySeries,
  growth,
  lastNDays,
  savingsRate,
  sum,
  txnsInMonth,
} from '../lib/stats';

export function HomePage() {
  const { user, txns, accounts, openComposer } = useApp();
  const now = new Date();

  const balances = useMemo(() => balancesOf(accounts, txns), [accounts, txns]);
  const total = useMemo(() => totalBalance(accounts, balances), [accounts, balances]);

  const view = useMemo(() => {
    const cur = txnsInMonth(txns, now);
    const prevRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prev = txnsInMonth(txns, prevRef);

    const expense = sum(cur, 'expense');
    const income = sum(cur, 'income');
    const prevExpense = sum(prev, 'expense');
    const slices = byCategory(cur, 'expense');
    const series = dailySeries(cur, now);
    const week = lastNDays(txns, 7);

    const passed = now.getDate();
    const dailyAvg = expense / Math.max(1, passed);
    const rate = savingsRate(income, expense);
    const weekdayCount = week.filter((d) => parseWeekday(d.date) >= 1 && parseWeekday(d.date) <= 5);
    const weekdaySpend = weekdayCount.reduce((a, d) => a + d.expense, 0);

    return {
      expense,
      income,
      balance: income - expense,
      prevExpense,
      delta: growth(expense, prevExpense),
      slices,
      series,
      week,
      weekTotal: week.reduce((a, d) => a + d.expense, 0),
      weekdayAvg: weekdaySpend / Math.max(1, weekdayCount.length),
      dailyAvg,
      rate,
      recent: [...txns]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
        .slice(0, 6),
      count: cur.length,
    };
  }, [txns]);

  const budget = user?.budget ?? 0;
  const ratio = budget > 0 ? view.expense / budget : 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const timeRatio = now.getDate() / daysInMonth;

  // 月末的判断和月中不一样，不然会说出"后面几天收一收"这种废话
  const budgetNote =
    ratio > 1
      ? '这个月已经超了。下个月要么把预算调高，要么先砍掉一项固定开销。'
      : timeRatio >= 0.9
      ? ratio >= 0.82
        ? '这个月基本收尾，节奏刚好。'
        : '这个月剩得挺多，控制得不错。'
      : ratio > timeRatio + 0.1
      ? '花得比时间快，后面几天收一收。'
      : ratio < timeRatio - 0.1
      ? '节奏偏慢，可以稍微松一点。'
      : '花销和进度基本同步。';

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">
            {greeting()}，{user?.name ?? '你'}
          </h1>
          <p className="page-sub">{todayLabel()} · 本月已记 {view.count} 笔</p>
        </div>
        <button className="btn btn-primary desktop-only" onClick={openComposer}>
          <Icon name="plus" size={17} />
          记一笔
        </button>
      </header>

      {/* ---------- 主卡 ---------- */}
      <section className="hero rise">
        <div className="hero-left">
          <span className="eyebrow">本月支出</span>
          <div className="hero-amount num">{moneyRound(view.expense)}</div>
          <div className="hero-meta">
            {view.delta === null ? (
              <span className="tag tag-neutral">上月没有记录</span>
            ) : (
              <span className={`delta ${view.delta > 0 ? 'is-up' : 'is-down'}`}>
                <Icon name={view.delta > 0 ? 'arrowUp' : 'arrowDown'} size={13} />
                {(Math.abs(view.delta) * 100).toFixed(0)}%
              </span>
            )}
            <span className="dim">较上月同期</span>
          </div>
          <MiniBars data={view.series} />
        </div>

        <div className="hero-right">
          <div className="hero-stat">
            <span className="hero-stat-label">本月收入</span>
            <span className="hero-stat-value num money-in">{moneyRound(view.income)}</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">结余</span>
            <span className="hero-stat-value num">{moneyRound(view.balance)}</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">日均支出</span>
            <span className="hero-stat-value num">{moneyRound(view.dailyAvg)}</span>
          </div>
        </div>
      </section>

      {/* ---------- 账户 ---------- */}
      <section className="accounts rise" style={{ animationDelay: '40ms' }}>
        <div className="accounts-head">
          <span className="card-title">账户</span>
          <span className="accounts-total">
            总资产 <b className="num">{moneyRound(total)}</b>
          </span>
        </div>
        <div className="account-row">
          {accounts.map((a) => {
            const bal = balances[a.id] ?? 0;
            return (
              <Link to="/me" className="account-card" key={a.id}>
                <span
                  className="acc-icon"
                  style={{ background: getAccountType(a.type).soft }}
                >
                  <AccountGlyph type={a.type} size={18} />
                </span>
                <span className="acc-name">{a.name}</span>
                <span className={`acc-bal num${bal < 0 ? ' is-negative' : ''}`}>
                  {money(bal)}
                </span>
              </Link>
            );
          })}
          <Link to="/me" className="account-card is-add" aria-label="管理账户">
            <span className="acc-icon">
              <Icon name="plus" size={18} />
            </span>
            <span className="acc-name">管理账户</span>
            <span className="acc-bal acc-bal-hint">新增 / 调整</span>
          </Link>
        </div>
      </section>

      {/* ---------- 预算 + 分类 ---------- */}
      <section className="grid-2">
        <div className="card rise" style={{ animationDelay: '60ms' }}>
          <div className="card-head">
            <span className="card-title">本月预算</span>
            <Link to="/me" className="btn btn-quiet">
              调整
              <Icon name="chevronRight" size={13} />
            </Link>
          </div>

          {budget > 0 ? (
            <>
              <div className="budget-nums">
                <span className="budget-used num">{Math.round(ratio * 100)}%</span>
                <span className="dim num">
                  {moneyRound(view.expense)} / {moneyRound(budget)}
                </span>
              </div>
              <BudgetBar ratio={ratio} timeRatio={timeRatio} />
              <div className="budget-foot">
                <span>
                  {ratio > 1
                    ? `已超支 ${moneyRound(view.expense - budget)}`
                    : `还能花 ${moneyRound(budget - view.expense)}`}
                </span>
                <span className="dim">时间过了 {Math.round(timeRatio * 100)}%</span>
              </div>
              <p className="budget-note">{budgetNote}</p>
            </>
          ) : (
            <div className="empty-inline">
              <p>还没有设置预算。</p>
              <Link to="/me" className="btn btn-ghost" style={{ marginTop: 12 }}>
                去设置
              </Link>
            </div>
          )}
        </div>

        <div className="card rise" style={{ animationDelay: '110ms' }}>
          <div className="card-head">
            <span className="card-title">花在了哪</span>
            <Link to="/insights" className="btn btn-quiet">
              详情
              <Icon name="chevronRight" size={13} />
            </Link>
          </div>

          {view.slices.length === 0 ? (
            <div className="empty-inline">
              <p>这个月还没有支出。</p>
            </div>
          ) : (
            <div className="split">
              <Donut slices={view.slices} total={view.expense} size={148} />
              <ul className="legend">
                {view.slices.slice(0, 5).map((s) => (
                  <li key={s.key}>
                    <span className="legend-dot" style={{ background: s.color }} />
                    <span className="legend-name">{s.label}</span>
                    <span className="legend-val num">{Math.round(s.share * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ---------- 近 7 天 ---------- */}
      <section className="card rise" style={{ animationDelay: '160ms' }}>
        <div className="card-head">
          <span className="card-title">近 7 天</span>
          <span className="dim num" style={{ fontSize: 13 }}>
            合计 {money(view.weekTotal)}
          </span>
        </div>
        <Bars data={view.week} />
      </section>

      {/* ---------- 最近流水 ---------- */}
      <section className="card rise" style={{ animationDelay: '210ms' }}>
        <div className="card-head">
          <span className="card-title">最近记录</span>
          <Link to="/txns" className="btn btn-quiet">
            全部
            <Icon name="chevronRight" size={13} />
          </Link>
        </div>

        {view.recent.length === 0 ? (
          <div className="empty-block">
            <div className="empty-icon">
              <Icon name="wallet" size={26} />
            </div>
            <p className="empty-title">还没有任何记录</p>
            <p className="empty-sub">记下第一笔，主页就会有内容了。</p>
            <button className="btn btn-primary" onClick={openComposer} style={{ marginTop: 14 }}>
              <Icon name="plus" size={16} />
              记一笔
            </button>
          </div>
        ) : (
          <ul className="txn-list">
            {view.recent.map((t) => (
              <li className="txn-row" key={t.id}>
                <span className="txn-icon">
                  <CategoryGlyph category={t.category} />
                </span>
                <div className="txn-main">
                  <span className="txn-note">{t.note}</span>
                  <span className="txn-sub">{relativeDay(t.date)}</span>
                </div>
                <span className={`txn-amount num ${t.type === 'income' ? 'is-in' : ''}`}>
                  {t.type === 'income' ? '+' : '−'}
                  {money(t.amount).replace('¥', '¥')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function parseWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}
