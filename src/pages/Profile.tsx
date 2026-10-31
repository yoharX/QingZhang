import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { ProfileEditor } from '../components/ProfileEditor';
import { AiSettings } from '../components/AiSettings';
import { AccountGlyph } from '../components/AccountGlyph';
import { AccountEditor } from '../components/AccountEditor';
import { HomeModuleSettings } from '../components/HomeModuleSettings';
import { balancesOf, getAccountType, totalBalance } from '../lib/accounts';
import { normalizeModules } from '../lib/homeModules';
import { normalizeAi } from '../lib/ai';
import { formatDateCN, money, moneyRound, toISODate } from '../lib/format';
import type { Account } from '../lib/types';

export function ProfilePage() {
  const {
    user,
    txns,
    accounts,
    setBudget,
    updateProfile,
    setHomeModules,
    setAi,
    clearTxns,
    loadDemoData,
    wipeAll,
    logout,
    exportBackup,
    exportCsv,
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [toast, setToast] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const aiCardRef = useRef<HTMLDivElement>(null);

  const balances = useMemo(() => balancesOf(accounts, txns), [accounts, txns]);
  const total = useMemo(() => totalBalance(accounts, balances), [accounts, balances]);
  const modules = useMemo(() => normalizeModules(user?.homeModules), [user?.homeModules]);
  const ai = useMemo(() => normalizeAi(user?.ai), [user?.ai]);

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

  // 从 AI 分析页跳过来时，直接把设置弹窗打开
  useEffect(() => {
    const st = location.state as { focus?: string; mode?: 'local' | 'remote' } | null;
    if (!st?.focus) return;
    if (st.focus === 'ai') {
      if (st.mode) setAi({ ...normalizeAi(user?.ai), mode: st.mode });
      setAiOpen(true);
      window.setTimeout(() => {
        const el = aiCardRef.current;
        if (el) window.scrollTo({ top: Math.max(0, el.offsetTop - 80), behavior: 'smooth' });
      }, 120);
    }
    // 消费掉 state，刷新不会重复弹
    navigate('/me', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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

  const aiSummary =
    ai.mode === 'local'
      ? '本地规则引擎'
      : ai.apiKey
      ? ai.model
      : '未配置密钥';

  const visibleCount = modules.filter((m) => m.visible).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">我的</h1>
          <p className="page-sub">资料、账户与数据</p>
        </div>
      </header>

      {/* 用户卡 */}
      <section className="card profile-card rise">
        <button className="profile-identity" onClick={() => setProfileOpen(true)}>
          <Avatar name={user?.name ?? '你'} avatar={user?.avatar} size={56} />
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <h2 className="profile-name">{user?.name ?? '未登录'}</h2>
            <p className="profile-mail">{user?.email}</p>
          </div>
          <span className="profile-edit">
            <Icon name="camera" size={14} />
            编辑
          </span>
        </button>

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

      {/* 首页板块 */}
      <section className="card rise" style={{ animationDelay: '80ms' }}>
        <div className="card-head">
          <span className="card-title">显示</span>
        </div>
        <ul className="setting-list">
          <li>
            <button className="setting-row" onClick={() => setModulesOpen(true)}>
              <span className="setting-icon">
                <Icon name="sliders" size={18} />
              </span>
              <span className="setting-main">
                <span className="setting-title">首页板块</span>
                <span className="setting-sub">调整顺序、隐藏不想看的</span>
              </span>
              <span className="setting-value">
                {visibleCount}/{modules.length}
              </span>
              <Icon name="chevronRight" size={15} className="setting-chev" />
            </button>
          </li>
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
        </ul>
      </section>

      {/* AI */}
      <section className="card rise" style={{ animationDelay: '120ms' }} ref={aiCardRef}>
        <div className="card-head">
          <span className="card-title">AI 分析</span>
        </div>
        <ul className="setting-list">
          <li>
            <button className="setting-row" onClick={() => setAiOpen(true)}>
              <span className="setting-icon">
                <Icon name="sparkle" size={18} />
              </span>
              <span className="setting-main">
                <span className="setting-title">分析方式</span>
                <span className="setting-sub">
                  {ai.mode === 'local' ? '全部在本机计算，不联网' : '调用你自己的模型接口'}
                </span>
              </span>
              <span className="setting-value">{aiSummary}</span>
              <Icon name="chevronRight" size={15} className="setting-chev" />
            </button>
          </li>
        </ul>
      </section>

      {/* 数据 */}
      <section className="card rise" style={{ animationDelay: '160ms' }}>
        <div className="card-head">
          <span className="card-title">数据</span>
        </div>
        <ul className="setting-list">
          <li>
            <div className="setting-row is-static">
              <span className="setting-icon">
                <Icon name="shield" size={18} />
              </span>
              <span className="setting-main">
                <span className="setting-title">存储位置</span>
                <span className="setting-sub">浏览器本地，不上传服务器</span>
              </span>
              <span className="tag tag-brand">本机</span>
            </div>
          </li>
          <li>
            <div className="setting-row is-static">
              <span className="setting-icon">
                <Icon name="calendar" size={18} />
              </span>
              <span className="setting-main">
                <span className="setting-title">开始记录</span>
                <span className="setting-sub">已用 {stats.span} 天</span>
              </span>
              <span className="setting-value num">
                {formatDateCN(toISODate(new Date(user?.joinedAt ?? Date.now())))}
              </span>
            </div>
          </li>
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
                <span className="setting-sub">JSON，含账号与全部流水</span>
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
                <span className="setting-sub">会重置账户与流水</span>
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
                <span className="setting-title">清空所有流水</span>
                <span className="setting-sub">保留账号与账户，不可恢复</span>
              </span>
              <Icon name="chevronRight" size={15} className="setting-chev" />
            </button>
          </li>
        </ul>
      </section>

      {/* 删除本地数据 */}
      <section className="card danger-card rise" style={{ animationDelay: '200ms' }}>
        <div className="danger-head">
          <Icon name="alert" size={16} />
          <span>删除本机数据</span>
        </div>
        <p className="danger-body">
          昵称、头像、账户、流水、AI 密钥全部存在这台设备的浏览器里。删除后本地不留任何记录，也没有云端副本可以恢复。
        </p>
        <div className="danger-actions">
          <button className="btn btn-danger" onClick={() => setConfirmWipe(true)}>
            删除全部数据
          </button>
          <button className="btn btn-ghost" onClick={logout}>
            <Icon name="logout" size={15} />
            退出登录
          </button>
        </div>
      </section>

      {/* 弹窗们 */}
      <ProfileEditor
        open={profileOpen}
        name={user?.name ?? ''}
        avatar={user?.avatar ?? 'initial'}
        onSave={(patch) => {
          updateProfile(patch);
          flash('资料已更新');
        }}
        onClose={() => setProfileOpen(false)}
      />

      <AiSettings
        open={aiOpen}
        config={ai}
        onSave={(cfg) => {
          setAi(cfg);
          flash(cfg.mode === 'local' ? '已切到本地分析' : '已保存模型配置');
        }}
        onClose={() => setAiOpen(false)}
      />

      <HomeModuleSettings
        open={modulesOpen}
        modules={modules}
        onChange={setHomeModules}
        onClose={() => setModulesOpen(false)}
      />

      <AccountEditor
        open={editorOpen}
        account={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
      />

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
          />
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
          这个月已经花了 {moneyRound(stats.expense)}。
        </p>
      </Modal>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="清空所有流水？"
        subtitle={`共 ${stats.count} 条记录将被删除`}
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
          账号、头像与账户设置会保留，流水无法恢复。
        </p>
      </Modal>

      <Modal
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title="删除本机全部数据？"
        subtitle="包括账号、头像、账户、流水与 AI 密钥"
        width={420}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmWipe(false)}>
              取消
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                setConfirmWipe(false);
                wipeAll();
              }}
            >
              确认删除
            </button>
          </>
        }
      >
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.8 }}>
          删完会回到登录页，localStorage 里不会留下任何东西。想留个底的话，先导出一份备份。
        </p>
      </Modal>

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}
