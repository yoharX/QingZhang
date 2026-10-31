import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { ACCOUNT_TYPES, BANKS, bankName, getAccountType, balancesOf } from '../lib/accounts';
import { money } from '../lib/format';
import type { Account, AccountType } from '../lib/types';
import { AccountGlyph } from './AccountGlyph';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  /** null 表示新建 */
  account: Account | null;
  onClose: () => void;
}

export function AccountEditor({ open, account, onClose }: Props) {
  const { accounts, txns, addAccount, updateAccount, setAccountBalance, removeAccount } = useApp();
  const [type, setType] = useState<AccountType>('alipay');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const balances = balancesOf(accounts, txns);

  useEffect(() => {
    if (!open) return;
    setError('');
    setConfirmDelete(false);
    if (account) {
      setType(account.type);
      setName(account.name);
      setBalance(String(Math.round((balances[account.id] ?? 0) * 100) / 100));
    } else {
      setType('alipay');
      setName('支付宝');
      setBalance('');
    }
    // balances 每次渲染都是新对象，这里只关心打开瞬间的快照
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account]);

  const pickType = (next: AccountType) => {
    setType(next);
    // 切换类型时给个默认名，用户可随时改
    if (next === 'bank') setName(bankName('cmb'));
    else if (next === 'alipay') setName('支付宝');
    else if (next === 'wechat') setName('微信');
    else setName('现金');
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('给账户起个名字');
      return;
    }
    if (trimmed.length > 16) {
      setError('名字太长，16 个字以内');
      return;
    }
    const value = balance.trim() === '' ? 0 : Number(balance);
    if (Number.isNaN(value) || Math.abs(value) > 100_000_000) {
      setError('余额填个数字');
      return;
    }

    const bankCode =
      type === 'bank' ? BANKS.find((b) => b.name === trimmed)?.code ?? 'custom' : undefined;

    if (account) {
      updateAccount(account.id, { type, name: trimmed, bankCode });
      setAccountBalance(account.id, value);
    } else {
      addAccount({ type, name: trimmed, bankCode, openingBalance: value });
    }
    onClose();
  };

  const del = () => {
    if (!account) return;
    const r = removeAccount(account.id);
    if (!r.ok) {
      setError(r.error ?? '删不掉');
      setConfirmDelete(false);
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? '编辑账户' : '新增账户'}
      subtitle={
        account ? '余额可随时校准，不会影响已记录的流水' : '选一个类型，起个名字就能用'
      }
      width={480}
      footer={
        <>
          {account && !confirmDelete && (
            <button
              className="btn btn-danger"
              style={{ marginRight: 'auto' }}
              onClick={() => setConfirmDelete(true)}
              disabled={accounts.length <= 1}
              title={accounts.length <= 1 ? '至少要保留一个账户' : undefined}
            >
              删除
            </button>
          )}
          {confirmDelete ? (
            <>
              <span style={{ marginRight: 'auto', fontSize: 12.5, color: 'var(--danger)' }}>
                流水会转到其它账户，确定删？
              </span>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={del}>
                确认删除
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={onClose}>
                取消
              </button>
              <button className="btn btn-primary" style={{ minWidth: 96 }} onClick={save}>
                保存
              </button>
            </>
          )}
        </>
      }
    >
      <div className="field">
        <span className="field-label">类型</span>
        <div className="acc-type-grid">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.key}
              className={`acc-type-cell${type === t.key ? ' is-active' : ''}`}
              onClick={() => pickType(t.key)}
            >
              <span className="acc-type-icon" style={{ background: t.soft }}>
                <AccountGlyph type={t.key} size={17} color={t.color} />
              </span>
              <span className="acc-type-label">{t.label}</span>
              <span className="acc-type-hint">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="acc-name">
          名称
        </label>
        <input
          id="acc-name"
          className="input"
          value={name}
          maxLength={16}
          placeholder={type === 'bank' ? '选一家银行，或自己填' : '比如：生活费'}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
        />
        {type === 'bank' && (
          <div className="bank-row">
            {BANKS.map((b) => (
              <button
                key={b.code}
                className={`bank-chip${name === b.name ? ' is-active' : ''}`}
                onClick={() => setName(b.name)}
              >
                {b.short}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="acc-balance">
          {account ? '当前余额' : '期初余额'}
        </label>
        <div className="acc-balance-input">
          <span className="acc-balance-symbol">¥</span>
          <input
            id="acc-balance"
            className="acc-balance-field num"
            inputMode="decimal"
            placeholder="0.00"
            value={balance}
            onChange={(e) => {
              setBalance(e.target.value.replace(/[^\d.-]/g, ''));
              setError('');
            }}
          />
        </div>
        <span className="field-hint">
          {account
            ? `当前显示 ${money(balances[account.id] ?? 0)}，改这里只调整期初，流水不动`
            : getAccountType(type).hint}
        </span>
      </div>

      {error && (
        <div className="field-error">
          <Icon name="alert" size={13} />
          {error}
        </div>
      )}
    </Modal>
  );
}
