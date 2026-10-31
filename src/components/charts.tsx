import { useId, useState } from 'react';
import type { DayPoint, MonthPoint } from '../lib/stats';
import { moneyRound } from '../lib/format';

/* ============================================================
   所有图表手写 SVG：不引图表库，色板与主题统一，体积为零
   ============================================================ */

/** 本月逐日支出迷你柱：给主卡一点节奏，不做坐标轴
 *  用平方根压缩比例，否则月初一笔房租会把其余日子压成一条线 */
export function MiniBars({ data }: { data: DayPoint[] }) {
  const max = Math.max(...data.map((d) => d.expense), 1);
  const today = new Date().getDate();
  return (
    <div className="mini-bars" aria-hidden="true">
      {data.map((d) => {
        const h = Math.sqrt(d.expense / max) * 100;
        const isToday = Number(d.label) === today;
        return (
          <span
            key={d.date}
            className={`mini-bar${isToday ? ' is-today' : ''}`}
            style={{ height: `${Math.max(3, h)}%` }}
            title={`${d.label} 日 · ${moneyRound(d.expense)}`}
          />
        );
      })}
    </div>
  );
}

/** 近 7 天支出柱 */
export function Bars({ data }: { data: DayPoint[] }) {
  const max = Math.max(...data.map((d) => d.expense), 1);
  const today = data[data.length - 1]?.date;
  return (
    <div className="bars">
      {data.map((d) => {
        const h = Math.max(4, (d.expense / max) * 100);
        const isToday = d.date === today;
        return (
          <div className="bar-col" key={d.date} title={moneyRound(d.expense)}>
            <div className="bar-track">
              <div
                className={`bar-fill${isToday ? ' is-today' : ''}`}
                style={{ height: `${h}%` }}
              />
            </div>
            <span className={`bar-label${isToday ? ' is-today' : ''}`}>
              {isToday ? '今天' : d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  share: number;
  color: string;
}

/** 分类占比环。hover 时该段加粗，中心文字切换为该分类金额 */
export function Donut({
  slices,
  total,
  centerLabel = '本月支出',
  size = 168,
}: {
  slices: DonutSlice[];
  total: number;
  centerLabel?: string;
  size?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const r = 40;
  const c = 2 * Math.PI * r;
  let acc = 0;

  const active = slices.find((s) => s.key === hover);

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="分类占比">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--paper-2)" strokeWidth="13" />
        <g transform="rotate(-90 50 50)">
          {slices.map((s) => {
            const len = Math.max(0, s.share * c - 1.6);
            const offset = -acc * c;
            acc += s.share;
            if (len <= 0) return null;
            return (
              <circle
                key={s.key}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={hover === s.key ? 16 : 13}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                style={{
                  transition: 'stroke-width 180ms cubic-bezier(.2,.8,.2,1)',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </g>
      </svg>
      <div className="donut-center">
        <span className="donut-label">{active ? active.label : centerLabel}</span>
        <span className="donut-value num">
          {moneyRound(active ? active.value : total)}
        </span>
        {active && <span className="donut-sub">{Math.round(active.share * 100)}%</span>}
      </div>
    </div>
  );
}

/** 近 6 个月收支对比柱 */
export function TrendChart({ data }: { data: MonthPoint[] }) {
  const gid = useId().replace(/:/g, '');
  const w = 620;
  const h = 200;
  const padX = 30;
  const padTop = 16;
  const padBottom = 28;
  // 顶到边会让柱子看起来"溢出"，留 12% 头部空间
  const max = Math.max(...data.flatMap((d) => [d.expense, d.income]), 1) * 1.12;
  const groupW = (w - padX * 2) / data.length;
  const barW = Math.min(27, groupW * 0.3);
  const scale = (v: number) => ((h - padTop - padBottom) * v) / max;

  return (
    <div className="trend">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="近六个月收支">
        <defs>
          <linearGradient id={`g-exp-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--expense)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--expense)" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`g-inc-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* 只保留 3 条基准线，压低数据噪声 */}
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={w - padX}
            y1={h - padBottom - (h - padTop - padBottom) * t}
            y2={h - padBottom - (h - padTop - padBottom) * t}
            stroke="var(--line)"
            strokeWidth="1"
            strokeDasharray={t === 1 ? '0' : '3 5'}
          />
        ))}

        {/* 基线 */}
        <line
          x1={padX - 6}
          x2={w - padX + 6}
          y1={h - padBottom}
          y2={h - padBottom}
          stroke="var(--line-strong)"
          strokeWidth="1"
        />

        {data.map((d, i) => {
          const cx = padX + groupW * i + groupW / 2;
          const eh = scale(d.expense);
          const ih = scale(d.income);
          const baseY = h - padBottom;
          return (
            <g key={d.key}>
              {eh > 0.5 && (
                <rect
                  x={cx - barW - 3}
                  y={baseY - eh}
                  width={barW}
                  height={eh}
                  rx={4}
                  fill={`url(#g-exp-${gid})`}
                />
              )}
              {ih > 0.5 && (
                <rect
                  x={cx + 3}
                  y={baseY - ih}
                  width={barW}
                  height={ih}
                  rx={4}
                  fill={`url(#g-inc-${gid})`}
                />
              )}
              <text
                x={cx}
                y={h - 8}
                textAnchor="middle"
                fontSize="11.5"
                fill="var(--ink-3)"
                fontFamily="var(--font-sans)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** 预算进度条：实心 = 已花，刻度线 = 时间进度 */
export function BudgetBar({ ratio, timeRatio }: { ratio: number; timeRatio: number }) {
  const clamped = Math.min(1, ratio);
  const over = ratio > 1;
  return (
    <div className="budget-bar">
      <div
        className={`budget-fill${over ? ' is-over' : ''}`}
        style={{ width: `${clamped * 100}%` }}
      />
      <div className="budget-mark" style={{ left: `${Math.min(100, timeRatio * 100)}%` }} />
    </div>
  );
}
