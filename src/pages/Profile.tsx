import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { AccountGlyph } from '../components/AccountGlyph';
import { AccountEditor } from '../components/AccountEditor';
import { balancesOf, getAccountType, totalBalance } from '../lib/accounts';
import { money, moneyRound } from '../lib/format';
import type { Account } from '../lib/types';

const VERSION = '0.1.0';

function initials(name: string): string {
  const n = name.trim();
  if (!n) return 'U';
  if (/[\u4e00-\u9fa5]/.test(n)) return n.slice(-2);
  return n.slice(0, 2).toUpperCase();
}

export function ProfilePage() {
  const {
    user,
    txns,
    accounts,
    setBudget,
    clearTxns,
    loadDemoData,
    logout,
    exportBackup,
    exportCsv,
  } = useApp();

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const balances = useMemo(() => balancesOf(accounts, txns), [accounts, txns]);
  const total = useMemo(() => totalBalance(accounts, balances), [accounts, balances]);

  const stats = useMemo(() => {
    const expense = txns.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    const days = new Set(txns.map((t) => t.date)).size;
    const joined = user?.joinedAt ?? Date.now();
    const span = Math.max(1, Math.ceil((Date.now() - joined) / 86400000));
    return { expense, days, span, count: txns.length };
  }, [txns, user]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1800);
  };

  const openBudget = () => {
    setBudgetInput(user?.budget ? String(user.budget) : '');
    setBudgetOpen(true);
  };

  const saveBudget = () => {
    const n = Number(budgetInput);
    if (Number.isNaN(n) || n < 0) return;
    setBudget(n);
    setBudgetOpen(false);
    flash(n > 0 ? '预算已更新' : '已取消预算');
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">我的</h1>
          <p className="page-sub">账号、预算与数据</p>
        </div>
      </header>

      {/* 用户卡 */}
      <section className="card profile-card rise">
        <div className="profile-identity">
          <div className="avatar avatar-lg">{initials(user?.name ?? '')}</div>
          <div style={{ minWidth: 0 }}>
            <h2 className="profile-name">{user?.name ?? '未登录'}</h2>
            <p className="profile-mail">{user?.email}</p>
          </div>
        </div>

        <div className="profile-stats">
          <div>
            <span className="ps-value num">{stats.count}</span>
            <span className="ps-label">条记录</span>
          </div>
          <div>
            <span className="ps-value num">{stats.days}</span>
            <span className="ps-label">天有记录</span>
          </div>
          <div>
            <span className="ps-value num">{moneyRound(stats.expense)}</span>
            <span className="ps-label">累计支出</span>
          </div>
        </div>
      </section>

      {/* 账户 */}
      <section className="card rise" style={{ animationDelay: '40ms' }}>
        <div className="card-head">
          <span className="card-title">账户</span>
          <button
            className="btn btn-quiet"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Icon name="plus" size={14} />
            新增
          </button>
        </div>
        <ul className="setting-list">
          {accounts.map((a) => {
            const def = getAccountType(a.type);
            const bal = balances[a.id] ?? 0;
            return (
              <li key={a.id}>
                <button
                  className="setting-row"
                  onClick={() => {
                    setEditing(a);
                    setEditorOpen(true);
                  }}
                >
                  <span className="setting-icon" style={{ background: def.soft }}>
                    <AccountGlyph type={a.type} size={17} />
                  </span>
                  <span className="setting-main">
                    <span className="setting-title">{a.name}</span>
                    <span className="setting-sub">
                      {a.type === 'bank' && a.bankCode === 'custom'
                        ? `${def.hint} · 自定义`
                        : def.hint}
                    </span>
                  </span>
                  <span className={`setting-value num${bal < 0 ? ' is-negative' : ''}`}>
                    {money(bal)}
                  </span>
                  <Icon name="chevronRight" size={15} className="setting-chev" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="acc-total-row">
          <span className="dim">总资产</span>
          <span className={`num${total < 0 ? ' is-negative' : ''}`}>{money(total)}</span>
        </div>
      </section>

      {/* 偏好 */}
      <section className="card rise" style={{ animationDelay: '60ms' }}>
        <div className="card-head">
          <span className="card-title">偏好</span>
        </div>
        <ul className="setting-list">
          <li>
            <button className="setting-row" onClick={openBudget}>
              <span className="setting-icon">
                <Icon name="wallet" size={18} />
              </span>
              <span className="setting-main">
                <span className="setting-title">月度预算</span>
                <span className="setting-sub">超出时会在主页提示</span>
              </span>
              <span className="setting-value num">
                {user?.budget ? moneyRound(user.budget) : '未设置'}
              </span>
              <Icon name="chevronRight" size={15} className="setting-chev" />
            </button>
          </li>
          <li>
            <div className="setting-row is-static">
              <span className="setting-icon">
                <Icon name="calendar" size={18} />
              </span>
              <span className="setting-main">
                <span className="setting-title">记账起始</span>
                <span className="setting-sub">从第一次记录算起</span>
              </span>
              <span className="setting-value num">{stats.span} 天</span>
            </div>
          </li>
          <li>
            <div className="setting-row is-static">
              <span className="setting-icon">
                <Icon name="shield" size={18} />
              </span>
              <span className="setting-main">
                <span className="setting-title">数据存储</span>
                <span className="setting-sub">浏览器本地，不上传服务器</span>
              </span>
              <span className="tag tag-brand">本机</span>
            </div>
          </li>
        </ul>
      </section>

      {/* 数据 */}
      <section className="card rise" style={{ animationDelay: '110ms' }}>
        <div className="card-head">
          <span className="card-title">数据</span>
        </div>
        <ul className="setting-list">
          <li>
            <button
              className="setting-row"
              onClick={() => {
                exportCsv();
                flash('CSV 已导出');
              }}
            >
              <span className="setting-icon">
                <Icon name="download" size={18} />
              </span>
              <span className="setting-main">
                <span className="setting-title">导出明细 CSV</span>
                <span className="setting-sub">Excel / 数字表格可直接打开</span>
              </span>
              <Icon name="chevronRight" size={15} className="setting-chev" />
            </button>
          </li>
          <li>
            <button
              className="setting-row"
              onClick={() => {
                exportBackup();
                flash('备份文件已生成');
              }}
            >
              <span className="setting-icon">
                <Icon name="download" size={18} />
              </span>
              <span className="setting-main">
                <span className="setting-title">导出完整备份</span>
                <span className="setting-sub">JSON 格式，含账号与全部流水</span>
              </span>
              <Icon name="chevronRight" size={15} className="setting-chev" />
            </button>
          </li>
          <li>
            <button
              className="setting-row"
              onClick={() => {
                loadDemoData();
                flash('示例数据已载入');
              }}
            >
              <span className="setting-icon">
                <Icon name="refresh" size={18} />
              </span>
              <span className="setting-main">
                <span className="setting-title">载入示例数据</span>
                <span className="setting-sub">会重置账户与流水，用于演示</span>
              </span>
              <Icon name="chevronRight" size={15} className="setting-chev" />
            </button>
          </li>
          <li>
            <button className="setting-row is-danger" onClick={() => setConfirmClear(true)}>
              <span className="setting-icon">
                <Icon name="trash" size={18} />
              </span>
              <span className="setting-main">
                <span className="setting-title">清空所有记录</span>
                <span className="setting-sub">不可恢复，建议先导出备份</span>
              </span>
              <Icon name="chevronRight" size={15} className="setting-chev" />
            </button>
          </li>
        </ul>
      </section>

      {/* 关于 */}
      <section className="card rise" style={{ animationDelay: '160ms' }}>
        <div className="card-head">
          <span className="card-title">关于</span>
        </div>
        <div className="about-block">
          <div className="about-row">
            <span className="dim">版本</span>
            <span className="num">
              {VERSION} · Demo
            </span>
          </div>
          <p className="about-note">
            轻帐第一版：只做记录、看账与解读三件事。当前为纯前端演示，账号、密码与流水均保存在此设备的浏览器中，换设备或清除站点数据会丢失。
          </p>
        </div>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={logout}>
          <Icon name="logout" size={16} />
          退出登录
        </button>
      </section>

      {/* 预算弹窗 */}
      <Modal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title="月度预算"
        subtitle="填 0 表示不设预算"
        width={420}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setBudgetOpen(false)}>
              取消
            </button>
            <button className="btn btn-primary" onClick={saveBudget}>
              保存
            </button>
          </>
        }
      >
        <div className="budget-input-wrap">
          <span className="budget-input-symbol">¥</span>
          <input
            className="budget-input num"
            inputMode="numeric"
            placeholder="6000"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value.replace(/[^\d]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveBudget();
            }}
            aria-label="月度预算金额"
            autoFocus
          />
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
          这个月已经花了 {moneyRound(stats.expense)}。
        </p>
      </Modal>

      {/* 清空确认 */}
      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="清空所有记录？"
        subtitle={`共 ${stats.count} 条流水将被删除`}
        width={400}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>
              取消
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                clearTxns();
                setConfirmClear(false);
                flash('已清空');
              }}
            >
              确认清空
            </button>
          </>
        }
      >
        <p className="muted" style={{ fontSize: 14 }}>
          删除后无法恢复，账号与预算设置会保留。
        </p>
      </Modal>

      <AccountEditor
        open={editorOpen}
        account={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
      />

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}
