/** 品牌标记：三行流水 + 一枚落下的硬币 —— 小尺寸下也不糊 */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="轻帐">
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <path
        d="M9.6 11.6h12.8M9.6 16.4h12.8M9.6 21.2h6.4"
        stroke="var(--paper)"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <circle cx="23" cy="21.2" r="2.5" fill="var(--accent)" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div className="brand-name">轻帐</div>
      {!compact && <div className="brand-sub">Qingzhang</div>}
    </div>
  );
}
