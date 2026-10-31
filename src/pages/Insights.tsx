import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { TrendChart } from '../components/charts';
import { analyze, type InsightTone } from '../lib/insights';
import { money, moneyRound } from '../lib/format';
import { monthlySeries } from '../lib/stats';

const TONE_META: Record<InsightTone, { label: string; cls: string; icon: 'alert' | 'check' | 'info' }> = {
  warn: { label: '注意', cls: 'is-warn', icon: 'alert' },
  good: { label: '不错', cls: 'is-good', icon: 'check' },
  info: { label: '观察', cls: 'is-info', icon: 'info' },
};

/** 占比小于 1% 时不要显示成 0% */
function formatShare(v: number): string {
  if (v <= 0) return '0%';
  if (v < 0.005) return '<1%';
  return `${Math.round(v * 100)}%`;
}

/** 环形健康分，跨度 270°，缺口在底部 */
function ScoreRing({ value, size = 128 }: { value: number; size?: number }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const sweep = 0.75; // 270°
  const filled = (Math.min(100, Math.max(0, value)) / 100) * circ * sweep;
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
        <g transform="rotate(135 60 60)">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="rgba(246,245,241,0.16)"
            strokeWidth="9"
            strokeDasharray={`${circ * sweep} ${circ}`}
            strokeLinecap="round"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="9"
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 800ms cubic-bezier(.2,.8,.2,1)' }}
          />
        </g>
      </svg>
      <div className="score-ring-center">
        <span className="score-num num">{value}</span>
        <span className="score-cap">健康分</span>
      </div>
    </div>
  );
}

export function InsightsPage() {
  const { txns, user, openComposer } = useApp();
  const [busy, setBusy] = useState(true);
  const [tick, setTick] = useState(0);

  const budget = user?.budget ?? 0;
  const result = useMemo(() => analyze(txns, budget), [txns, budget]);
  const trend = useMemo(() => monthlySeries(txns, 6), [txns]);

  // 进入页面与手动刷新时都跑一遍"分析"过程，让状态可感知
  useEffect(() => {
    setBusy(true);
    const id = window.setTimeout(() => setBusy(false), 900);
    return () => window.clearTimeout(id);
  }, [tick]);

  const rerun = () => setTick((v) => v + 1);

  const maxSlice = result.slices[0]?.value ?? 1;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">AI 分析</h1>
          <p className="page-sub">基于本月流水，找出值得注意的变化</p>
        </div>
        <button className="btn btn-ghost" onClick={rerun} disabled={busy}>
          <Icon name="refresh" size={16} className={busy ? 'spin' : undefined} />
          {busy ? '分析中' : '重新分析'}
        </button>
      </header>

      {/* ---------- 解读主卡 ---------- */}
      <section className={`insight-hero rise${busy ? ' is-busy' : ''}`}>
        <div className="insight-hero-main">
          <div className="insight-hero-head">
            <span className="ai-badge">
              <Icon name="sparkle" size={14} />
              本期解读
            </span>
            {busy && <span className="ai-scan" />}
          </div>

          {busy ? (
            <>
              <div className="skeleton sk-line sk-lg" />
              <div className="skeleton sk-line" style={{ width: '86%' }} />
              <div className="skeleton sk-line" style={{ width: '62%' }} />
            </>
          ) : (
            <>
              <h2 className="insight-headline">{result.headline}</h2>
              <p className="insight-narrative">{result.narrative}</p>
            </>
          )}

          <div className="insight-hero-stats">
            <div>
              <span className="ihs-label">本月支出</span>
              <span className="ihs-value num">{moneyRound(result.monthExpense)}</span>
            </div>
            <div>
              <span className="ihs-label">本月收入</span>
              <span className="ihs-value num">{moneyRound(result.monthIncome)}</span>
            </div>
            <div>
              <span className="ihs-label">记录天数</span>
              <span className="ihs-value num">
                {result.recordedDays}
                <small> 天</small>
              </span>
            </div>
          </div>
        </div>

        <div className="insight-hero-score">
          <ScoreRing value={busy ? 0 : result.health.total} />
          <div className="score-side">
            <span className="score-level">{busy ? '—' : result.health.level}</span>
            <div className="score-parts">
              <span>储蓄 {busy ? '-' : result.health.saving}</span>
              <span>预算 {busy ? '-' : result.health.budget}</span>
              <span>结构 {busy ? '-' : result.health.diversity}</span>
              <span>习惯 {busy ? '-' : result.health.habit}</span>
            </div>
          </div>
        </div>
      </section>

      <p className="ai-source">
        <Icon name="info" size={13} />
        这一版由本地规则引擎计算，数据不出设备；接入模型后可以给出更具体的建议。
      </p>

      {/* ---------- 洞察卡 ---------- */}
      {busy ? (
        <section className="insight-grid">
          {[0, 1, 2, 3].map((i) => (
            <div className="card insight-card" key={i}>
              <div className="skeleton sk-line" style={{ width: '30%' }} />
              <div className="skeleton sk-line sk-lg" style={{ width: '78%', marginTop: 14 }} />
              <div className="skeleton sk-line" style={{ width: '92%', marginTop: 10 }} />
              <div className="skeleton sk-line" style={{ width: '54%', marginTop: 6 }} />
            </div>
          ))}
        </section>
      ) : (
        <section className="insight-grid">
          {/* 两列网格，取偶数条避免最后一行单卡留白 */}
          {result.insights.slice(0, 6).map((ins, i) => {
            const meta = TONE_META[ins.tone];
            return (
              <article
                className={`card insight-card ${meta.cls} rise`}
                key={ins.id}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <header className="insight-card-head">
                  <span className={`insight-tag ${meta.cls}`}>
                    <Icon name={meta.icon} size={12} />
                    {ins.tag}
                  </span>
                  {ins.metric && (
                    <span className="insight-metric">
                      <span className="dim">{ins.metric.label}</span>
                      <span className="num">{ins.metric.value}</span>
                    </span>
                  )}
                </header>
                <h3 className="insight-title">{ins.title}</h3>
                <p className="insight-body">{ins.body}</p>
              </article>
            );
          })}
        </section>
      )}

      {/* ---------- 趋势 ---------- */}
      <section className="card rise" style={{ animationDelay: '120ms' }}>
        <div className="card-head">
          <span className="card-title">近六个月</span>
          <div className="chart-legend">
            <span>
              <i style={{ background: 'var(--expense)' }} />
              支出
            </span>
            <span>
              <i style={{ background: 'var(--brand)' }} />
              收入
            </span>
          </div>
        </div>
        <TrendChart data={trend} />
      </section>

      {/* ---------- 分类排行 ---------- */}
      <section className="card rise" style={{ animationDelay: '170ms' }}>
        <div className="card-head">
          <span className="card-title">本月分类排行</span>
          <span className="dim num" style={{ fontSize: 13 }}>
            共 {result.slices.length} 类
          </span>
        </div>

        {result.slices.length === 0 ? (
          <div className="empty-block">
            <div className="empty-icon">
              <Icon name="sparkle" size={24} />
            </div>
            <p className="empty-title">还没有可分析的支出</p>
            <p className="empty-sub">记几笔之后，这里会按占比排出来。</p>
            <button className="btn btn-primary" onClick={openComposer} style={{ marginTop: 14 }}>
              记一笔
            </button>
          </div>
        ) : (
          <ul className="rank-list">
            {result.slices.map((s) => (
              <li key={s.key} className="rank-row">
                <span className="rank-name">{s.label}</span>
                <span className="rank-track">
                  <span
                    className="rank-fill"
                    style={{
                      width: `${(s.value / maxSlice) * 100}%`,
                      background: s.color,
                    }}
                  />
                </span>
                <span className="rank-val num">{money(s.value)}</span>
                <span className="rank-pct num dim">{formatShare(s.share)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
