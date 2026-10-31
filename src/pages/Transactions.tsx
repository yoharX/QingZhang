import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { CategoryGlyph } from '../components/CategoryGlyph';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { getCategory } from '../lib/categories';
import { addMonths, formatDateCN, money, toISODate, weekdayCN } from '../lib/format';
import { groupByDay, sum, txnsInMonth } from '../lib/stats';
import type { Txn, TxnType } from '../lib/types';

type Filter = 'all' | TxnType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'expense', label: '支出' },
  { key: 'income', label: '收入' },
];

/** 首屏渲染条数，一屏之外按需追加，避免一次挂 600 个节点 */
const PAGE = 40;

/** 分组头只显示日期本体，周几单独一列，避免出现「10月29日 周四 周四」 */
function dayMain(dateStr: string): string {
  const today = toISODate(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = toISODate(y);
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  return formatDateCN(dateStr);
}

export function TxnsPage() {
  const { txns, accounts, removeTxn, openComposer } = useApp();
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<Txn | null>(null);
  const [visible, setVisible] = useState(PAGE);

  const ref = useMemo(() => addMonths(new Date(), offset), [offset]);

  const accountName = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts]
  );

  const monthTxns = useMemo(() => txnsInMonth(txns, ref), [txns, ref]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monthTxns.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (!q) return true;
      const label = getCategory(t.category).label;
      return t.note.toLowerCase().includes(q) || label.toLowerCase().includes(q);
    });
  }, [monthTxns, filter, query]);

  // 换月份 / 换筛选 / 改搜索词时回到首屏条数
  useEffect(() => {
    setVisible(PAGE);
  }, [offset, filter, query]);

  const groups = useMemo(() => groupByDay(filtered.slice(0, visible)), [filtered, visible]);
  const expense = sum(monthTxns, 'expense');
  const income = sum(monthTxns, 'income');

  const monthLabel = `${ref.getFullYear()} 年 ${ref.getMonth() + 1} 月`;
  const isCurrentMonth = offset === 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">收支</h1>
          <p className="page-sub">按天看，比按年看更能发现问题</p>
        </div>
        <button className="btn btn-primary desktop-only" onClick={openComposer}>
          <Icon name="plus" size={17} />
          记一笔
        </button>
      </header>

      {/* 月份切换 + 汇总 */}
      <section className="card month-bar rise">
        <div className="month-switch">
          <button
            className="icon-btn"
            onClick={() => setOffset((v) => v - 1)}
            aria-label="上个月"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <div className="month-name">
            {monthLabel}
            {isCurrentMonth && <span className="tag tag-brand">本月</span>}
          </div>
          <button
            className="icon-btn"
            onClick={() => setOffset((v) => Math.min(0, v + 1))}
            aria-label="下个月"
            disabled={isCurrentMonth}
          >
            <Icon name="chevronRight" size={18} />
          </button>
        </div>

        <div className="month-sum">
          <div className="month-sum-item">
            <span className="dim">支出</span>
            <span className="num month-sum-val is-out">{money(expense)}</span>
          </div>
          <div className="month-sum-div" />
          <div className="month-sum-item">
            <span className="dim">收入</span>
            <span className="num month-sum-val is-in">{money(income)}</span>
          </div>
          <div className="month-sum-div" />
          <div className="month-sum-item">
            <span className="dim">结余</span>
            <span className="num month-sum-val">{money(income - expense)}</span>
          </div>
        </div>
      </section>

      {/* 筛选 */}
      <section className="filter-bar rise" style={{ animationDelay: '50ms' }}>
        <div className="chip-row">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chip${filter === f.key ? ' is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="search">
          <Icon name="search" size={16} />
          <input
            className="search-input"
            placeholder="搜备注或分类"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索流水"
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')} aria-label="清除">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </section>

      {/* 列表 */}
      {groups.length === 0 ? (
        <section className="card">
          <div className="empty-block">
            <div className="empty-icon">
              <Icon name="search" size={24} />
            </div>
            <p className="empty-title">
              {monthTxns.length === 0 ? '这个月还没有记录' : '没找到匹配的条目'}
            </p>
            <p className="empty-sub">
              {monthTxns.length === 0 ? '记一笔，或者切到上个月看看。' : '换个关键词试试。'}
            </p>
          </div>
        </section>
      ) : (
        <div className="day-groups">
          {groups.map((g, gi) => (
            <section
              className="day-group rise"
              key={g.date}
              style={{ animationDelay: `${Math.min(gi * 30, 240)}ms` }}
            >
              <header className="day-head">
                <div className="day-date">
                  <span>{dayMain(g.date)}</span>
                  <span className="day-week">{weekdayCN(g.date)}</span>
                </div>
                <div className="day-total num">
                  {g.expense > 0 && <span className="is-out">−{money(g.expense)}</span>}
                  {g.income > 0 && <span className="is-in">+{money(g.income)}</span>}
                </div>
              </header>

              <ul className="txn-list bordered">
                {g.items.map((t) => (
                  <li className="txn-row has-action" key={t.id}>
                    <span className="txn-icon">
                      <CategoryGlyph category={t.category} />
                    </span>
                    <div className="txn-main">
                      <span className="txn-note">{t.note}</span>
                      <span className="txn-sub">
                        {getCategory(t.category).label} · {accountName.get(t.accountId) ?? '账户'}
                      </span>
                    </div>
                    <span className={`txn-amount num ${t.type === 'income' ? 'is-in' : ''}`}>
                      {t.type === 'income' ? '+' : '−'}
                      {money(t.amount)}
                    </span>
                    <button
                      className="row-del"
                      onClick={() => setPending(t)}
                      aria-label={`删除 ${t.note}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {filtered.length > visible && (
        <div className="list-more">
          <span className="dim">
            已显示 {visible} / {filtered.length} 条
          </span>
          <button className="btn btn-ghost" onClick={() => setVisible((v) => v + 60)}>
            继续加载
          </button>
        </div>
      )}

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title="删除这条记录？"
        subtitle={pending ? `${pending.note} · ${money(pending.amount)}` : ''}
        width={400}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setPending(null)}>
              取消
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (pending) removeTxn(pending.id);
                setPending(null);
              }}
            >
              删除
            </button>
          </>
        }
      >
        <p className="muted" style={{ fontSize: 14 }}>
          删掉之后这条不会出现在统计里，且无法恢复。
        </p>
      </Modal>
    </div>
  );
}
