import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { AiSettings } from '../components/AiSettings';
import { TrendChart } from '../components/charts';
import { analyze, type InsightTone } from '../lib/insights';
import { aiReady, analyzeRemote, normalizeAi, type RemoteResult } from '../lib/ai';
import type { AiConfig, AiMode } from '../lib/types';
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
  const sweep = 0.75;
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
            stroke="rgba(238,247,251,0.16)"
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

interface CardItem {
  id: string;
  tone: InsightTone;
  tag: string;
  title: string;
  body: string;
  metric?: { label: string; value: string };
}

export function InsightsPage() {
  const { txns, user, openComposer, setAi } = useApp();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(true);
  const [remote, setRemote] = useState<RemoteResult | null>(null);
  const [err, setErr] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const reqId = useRef(0);

  const ai = useMemo(() => normalizeAi(user?.ai), [user?.ai]);
  const budget = user?.budget ?? 0;
  const result = useMemo(() => analyze(txns, budget), [txns, budget]);
  const trend = useMemo(() => monthlySeries(txns, 6), [txns]);
  const remoteMode = ai.mode === 'remote';
  const configured = aiReady(ai);

  // 本地 / 远程切换或手动刷新时重新跑一次
  useEffect(() => {
    const my = ++reqId.current;
    setErr('');

    if (remoteMode && configured) {
      setBusy(true);
      analyzeRemote(
        {
          month: `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`,
          expense: result.monthExpense,
          income: result.monthIncome,
          prevExpense: result.prevExpense,
          budget,
          recordedDays: result.recordedDays,
          totalDays: result.totalDays,
          categories: result.slices.map((s) => ({
            label: s.label,
            value: s.value,
            share: s.share,
            count: s.count,
          })),
          monthly: trend.map((m) => ({ label: m.label, expense: m.expense, income: m.income })),
        },
        ai
      )
        .then((r) => {
          if (my !== reqId.current) return;
          setRemote(r);
          setBusy(false);
        })
        .catch((e: unknown) => {
          if (my !== reqId.current) return;
          setErr(e instanceof Error ? e.message : '调用失败');
          setBusy(false);
        });
      return;
    }

    setBusy(true);
    const t = window.setTimeout(() => setBusy(false), 900);
    return () => window.clearTimeout(t);
  }, [remoteMode, configured, tick, result, budget, trend, ai]);

  const rerun = () => setTick((v) => v + 1);

  const switchMode = (mode: AiMode) => {
    setAi({ ...ai, mode });
    // 没填过密钥就直接把配置弹出来，省得再找入口
    if (mode === 'remote' && !configured) setAiOpen(true);
  };

  const cards: CardItem[] = useMemo(() => {
    if (remoteMode && remote) {
      return remote.insights.map((ins, i) => ({
        id: `r-${i}`,
        tone: ins.tone,
        tag: ins.tag,
        title: ins.title,
        body: ins.body,
      }));
    }
    return result.insights.slice(0, 6).map((ins) => ({
      id: ins.id,
      tone: ins.tone,
      tag: ins.tag,
      title: ins.title,
      body: ins.body,
      metric: ins.metric,
    }));
  }, [remoteMode, remote, result.insights]);

  const maxSlice = result.slices[0]?.value ?? 1;
  const showRemoteHint = remoteMode && !configured;
  const headline = remoteMode && remote ? remote.headline : result.headline;
  const narrative = remoteMode && remote ? remote.narrative : result.narrative;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">AI 分析</h1>
          <p className="page-sub">
            {remoteMode ? '由大模型读你的账目后给出解读' : '基于本月流水，找出值得注意的变化'}
          </p>
        </div>
        <div className="head-actions">
          <div className="seg seg-mini" role="tablist" aria-label="分析方式">
            <button
              role="tab"
              aria-selected={!remoteMode}
              className={`seg-item${!remoteMode ? ' is-active' : ''}`}
              onClick={() => switchMode('local')}
            >
              本地
            </button>
            <button
              role="tab"
              aria-selected={remoteMode}
              className={`seg-item${remoteMode ? ' is-active' : ''}`}
              onClick={() => switchMode('remote')}
            >
              大模型
            </button>
          </div>
          <button className="btn btn-ghost btn-icon-only" onClick={rerun} disabled={busy}>
            <Icon name="refresh" size={16} className={busy ? 'spin' : undefined} />
            <span className="btn-label">{busy ? '分析中' : '重新分析'}</span>
          </button>
        </div>
      </header>

      {/* ---------- 解读主卡 ---------- */}
      <section className={`insight-hero rise${busy ? ' is-busy' : ''}`}>
        <div className="insight-hero-main">
          <div className="insight-hero-head">
            <span className="ai-badge">
              <Icon name="sparkle" size={14} />
              {remoteMode ? remote?.model ?? ai.model : '本期解读'}
            </span>
            {busy && <span className="ai-scan" />}
          </div>

          {showRemoteHint ? (
            <>
              <h2 className="insight-headline">还没有配置大模型</h2>
              <p className="insight-narrative">
                在「我的 → AI 分析」里填接口地址、密钥和模型名，就能让模型读你的账目。密钥只存在这台设备上。
              </p>
              <button
                className="btn btn-hero"
                style={{ marginTop: 18 }}
                onClick={() => navigate('/me', { state: { focus: 'ai' } })}
              >
                去配置
                <Icon name="chevronRight" size={14} />
              </button>
            </>
          ) : err ? (
            <>
              <h2 className="insight-headline">这次没分析成功</h2>
              <p className="insight-narrative">{err}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                <button className="btn btn-hero" onClick={rerun}>
                  重试
                </button>
                <button
                  className="btn btn-hero-ghost"
                  onClick={() => navigate('/me', { state: { focus: 'ai' } })}
                >
                  检查配置
                </button>
              </div>
            </>
          ) : busy ? (
            <>
              <div className="skeleton sk-line sk-lg" />
              <div className="skeleton sk-line" style={{ width: '86%' }} />
              <div className="skeleton sk-line" style={{ width: '62%' }} />
              {remoteMode && <p className="ai-wait">正在请求 {ai.model}，通常 5–15 秒</p>}
            </>
          ) : (
            <>
              <h2 className="insight-headline">{headline}</h2>
              <p className="insight-narrative">{narrative}</p>
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
        {remoteMode
          ? `解读由 ${remote?.model || ai.model} 生成，健康分与图表仍是本地计算；数据只发给你配置的服务商。`
          : '本地规则引擎计算，数据不出设备；切到「大模型」可以让模型来读。'}
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
      ) : cards.length > 0 ? (
        <section className="insight-grid">
          {cards.slice(0, 6).map((ins, i) => {
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
      ) : null}

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
                    style={{ width: `${(s.value / maxSlice) * 100}%`, background: s.color }}
                  />
                </span>
                <span className="rank-val num">{money(s.value)}</span>
                <span className="rank-pct num dim">{formatShare(s.share)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AiSettings
        open={aiOpen}
        config={ai}
        onSave={(cfg: AiConfig) => setAi(cfg)}
        onClose={() => setAiOpen(false)}
      />
    </div>
  );
}
