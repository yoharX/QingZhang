import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AccountType, TxnType } from '../lib/types';
import { formatDateCN, money } from '../lib/format';
import { AccountGlyph } from './AccountGlyph';
import { CategoryGlyph } from './CategoryGlyph';
import { Icon } from './Icon';

export interface SaveReceipt {
  type: TxnType;
  amount: number;
  categoryKey: string;
  categoryLabel: string;
  accountName: string;
  accountType: AccountType;
  note: string;
  date: string;
  balanceBefore: number;
  balanceAfter: number;
}

type Phase = 'check' | 'out' | 'receipt';

/** 保存后的动效编排：卡片弹出 → 画对勾 → 卡片退场 → 回执弹出
 *  时间线集中在这里，改节奏只改这三个数 */
const T_DRAW_END = 1480; // 对勾画完并停留
const T_CARD_OUT = 1820; // 卡片退场结束，回执登场

export function SaveFlow({
  receipt,
  onClose,
}: {
  receipt: SaveReceipt | null;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('check');

  useEffect(() => {
    if (!receipt) return;
    setPhase('check');
    const t1 = window.setTimeout(() => setPhase('out'), T_DRAW_END);
    const t2 = window.setTimeout(() => setPhase('receipt'), T_CARD_OUT);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      document.body.style.overflow = prevOverflow;
    };
  }, [receipt]);

  // 回执阶段允许 Esc 关闭
  useEffect(() => {
    if (phase !== 'receipt') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, onClose]);

  if (!receipt) return null;

  const now = new Date();
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isIncome = receipt.type === 'income';

  return createPortal(
    <div className="flow-root" role="dialog" aria-modal="true" aria-label="记账结果">
      <div
        className="flow-scrim"
        onClick={phase === 'receipt' ? onClose : undefined}
        style={{ cursor: phase === 'receipt' ? 'pointer' : 'default' }}
      />

      {phase !== 'receipt' && (
        <div className={`flow-check${phase === 'out' ? ' is-out' : ''}`}>
          <div className="flow-check-card">
            <svg className="check-svg" viewBox="0 0 72 72" aria-hidden="true">
              <circle className="check-ring" cx="36" cy="36" r="31.5" />
              <path className="check-mark" d="M22.5 37.2 32 46.6 50 25.4" />
            </svg>
            <span className="flow-check-text">已记录</span>
          </div>
        </div>
      )}

      {phase === 'receipt' && (
        <div className="flow-receipt-wrap">
          <div className="receipt">
            <div className="receipt-body">
              <header className="receipt-head">
                <span className="receipt-brand">
                  <span className="receipt-dot" />
                  轻帐
                </span>
                <span className="receipt-time num">{clock}</span>
              </header>

              <div className="receipt-hero">
                <span className={`receipt-flag ${isIncome ? 'is-in' : 'is-out'}`}>
                  {isIncome ? '收入' : '支出'}
                </span>
                <div className="receipt-amount num">
                  {isIncome ? '+' : '−'}
                  {money(receipt.amount)}
                </div>
                <p className="receipt-caption">记账成功</p>
              </div>

              <ul className="receipt-meta">
                <li>
                  <span className="rm-key">分类</span>
                  <span className="rm-val">
                    <CategoryGlyph category={receipt.categoryKey} size={15} />
                    {receipt.categoryLabel}
                  </span>
                </li>
                <li>
                  <span className="rm-key">账户</span>
                  <span className="rm-val">
                    <AccountGlyph type={receipt.accountType} size={15} />
                    {receipt.accountName}
                  </span>
                </li>
                <li>
                  <span className="rm-key">日期</span>
                  <span className="rm-val num">{formatDateCN(receipt.date, true)}</span>
                </li>
                {receipt.note && (
                  <li>
                    <span className="rm-key">备注</span>
                    <span className="rm-val rm-note">{receipt.note}</span>
                  </li>
                )}
              </ul>

              <div className="receipt-divider" />

              <div className="receipt-balance">
                <span className="rb-label">{receipt.accountName}余额</span>
                <span className="rb-flow num">
                  <span className="dim">{money(receipt.balanceBefore)}</span>
                  <Icon name="chevronRight" size={12} />
                  <strong>{money(receipt.balanceAfter)}</strong>
                </span>
              </div>
            </div>

            <div className="receipt-perf" />
          </div>

          <button className="btn btn-primary btn-block receipt-done" onClick={onClose}>
            完成
          </button>
          <p className="flow-hint">点任意处关闭</p>
        </div>
      )}
    </div>,
    document.body
  );
}
