import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { categoriesOf, getCategory } from '../lib/categories';
import { balancesOf, getAccountType } from '../lib/accounts';
import { toISODate, money } from '../lib/format';
import type { AccountType, TxnType } from '../lib/types';
import { Icon } from './Icon';
import { CategoryGlyph } from './CategoryGlyph';
import { AccountGlyph } from './AccountGlyph';
import { Modal } from './Modal';
import { SaveFlow, type SaveReceipt } from './SaveFlow';

export function Composer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addTxn, accounts, txns } = useApp();
  const [type, setType] = useState<TxnType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<SaveReceipt | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const cats = useMemo(() => categoriesOf(type), [type]);
  const balances = useMemo(() => balancesOf(accounts, txns), [accounts, txns]);

  // 打开时重置并聚焦金额，减少一次点击
  useEffect(() => {
    if (!open) return;
    setType('expense');
    setAmount('');
    setCategory('food');
    setNote('');
    setDate(toISODate(new Date()));
    setError('');
    setAccountId((prev) => (prev && accounts.some((a) => a.id === prev) ? prev : accounts[0]?.id ?? ''));
    const id = window.setTimeout(() => amountRef.current?.focus(), 220);
    return () => window.clearTimeout(id);
  }, [open, accounts]);

  const switchType = (next: TxnType) => {
    setType(next);
    setCategory(next === 'expense' ? 'food' : 'salary');
  };

  const submit = () => {
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError('金额要大于 0');
      amountRef.current?.focus();
      return;
    }
    if (value > 10_000_000) {
      setError('金额太大了，检查一下');
      return;
    }
    if (!accountId) {
      setError('先选一个账户');
      return;
    }

    const rounded = Math.round(value * 100) / 100;
    const cat = getCategory(category);
    const account = accounts.find((a) => a.id === accountId);
    const before = balances[accountId] ?? 0;
    const after = before + (type === 'income' ? rounded : -rounded);

    addTxn({
      type,
      amount: rounded,
      category,
      note: note.trim() || cat.label,
      date,
      accountId,
    });

    // 先关表单再起流程，避免两层浮层叠在一起
    setReceipt({
      type,
      amount: rounded,
      categoryLabel: cat.label,
      categoryKey: category,
      accountName: account?.name ?? '账户',
      accountType: (account?.type ?? 'alipay') as AccountType,
      note: note.trim(),
      date,
      balanceBefore: before,
      balanceAfter: after,
    });
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="记一笔"
        subtitle="几秒钟就够了，写清楚比写完整重要"
        width={520}
        footer={
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button className="btn btn-primary" style={{ minWidth: 120 }} onClick={submit}>
              保存
            </button>
          </>
        }
      >
        <div className="seg" role="tablist" aria-label="收支类型">
          <button
            role="tab"
            aria-selected={type === 'expense'}
            className={`seg-item${type === 'expense' ? ' is-active' : ''}`}
            onClick={() => switchType('expense')}
          >
            支出
          </button>
          <button
            role="tab"
            aria-selected={type === 'income'}
            className={`seg-item${type === 'income' ? ' is-active' : ''}`}
            onClick={() => switchType('income')}
          >
            收入
          </button>
        </div>

        <div className={`amount-box${error ? ' is-error' : ''}`}>
          <span className="amount-symbol">¥</span>
          <input
            ref={amountRef}
            className="amount-input num"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d.]/g, '');
              setAmount(v);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            aria-label="金额"
          />
          <span className="amount-type">{type === 'expense' ? '支出' : '收入'}</span>
        </div>
        {error && (
          <div className="field-error" style={{ marginTop: -6 }}>
            <Icon name="alert" size={13} />
            {error}
          </div>
        )}

        <div className="field">
          <span className="field-label">分类</span>
          <div className="cat-scroll">
            <div className="cat-grid">
              {cats.map((c) => (
                <button
                  key={c.key}
                  className={`cat-cell${category === c.key ? ' is-active' : ''}`}
                  onClick={() => setCategory(c.key)}
                >
                  <span className="cat-cell-icon">
                    <CategoryGlyph category={c.key} size={19} />
                  </span>
                  <span className="cat-cell-label">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="field">
          <span className="field-label">从哪个账户</span>
          <div className="acc-picker">
            {accounts.map((a) => {
              const def = getAccountType(a.type);
              return (
                <button
                  key={a.id}
                  className={`acc-chip${accountId === a.id ? ' is-active' : ''}`}
                  onClick={() => setAccountId(a.id)}
                  title={`${a.name} · ${money(balances[a.id] ?? 0)}`}
                >
                  <AccountGlyph type={a.type} size={15} color={def.color} />
                  <span className="acc-chip-name">{a.name}</span>
                  <span className="acc-chip-bal num">{money(balances[a.id] ?? 0)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="composer-row">
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label" htmlFor="composer-note">
              备注
            </label>
            <input
              id="composer-note"
              className="input"
              placeholder="比如：楼下便利店"
              value={note}
              maxLength={40}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="field" style={{ width: 168 }}>
            <label className="field-label" htmlFor="composer-date">
              日期
            </label>
            <input
              id="composer-date"
              className="input"
              type="date"
              value={date}
              max={toISODate(new Date())}
              onChange={(e) => setDate(e.target.value || toISODate(new Date()))}
            />
          </div>
        </div>
      </Modal>

      <SaveFlow receipt={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
