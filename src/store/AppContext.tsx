import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Account, AiConfig, HomeModule, Txn, User } from '../lib/types';
import * as store from '../lib/storage';
import { getCategory } from '../lib/categories';
import { getAccountType, netOf } from '../lib/accounts';
import { DEFAULT_MODULES } from '../lib/homeModules';
import { DEFAULT_AI } from '../lib/ai';

interface AppContextValue {
  ready: boolean;
  user: User | null;
  accounts: Account[];
  txns: Txn[];
  /* 认证 */
  register: (name: string, email: string, password: string) => Promise<string | null>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  /* 流水 */
  addTxn: (t: Omit<Txn, 'id' | 'createdAt'>) => void;
  removeTxn: (id: string) => void;
  /* 账户 */
  addAccount: (a: Omit<Account, 'id' | 'createdAt'>) => string;
  updateAccount: (id: string, patch: Partial<Omit<Account, 'id' | 'createdAt'>>) => void;
  /** 直接设定当前余额，内部反推期初余额，保证流水不被动过 */
  setAccountBalance: (id: string, target: number) => void;
  removeAccount: (id: string) => { ok: boolean; error?: string };
  /* 其他 */
  setBudget: (n: number) => void;
  /** 改昵称、头像 */
  updateProfile: (patch: Partial<Pick<User, 'name' | 'avatar'>>) => void;
  setHomeModules: (list: HomeModule[]) => void;
  setAi: (cfg: AiConfig) => void;
  /** 删除本地全部数据：账号、流水、账户、配置 */
  wipeAll: () => void;
  clearTxns: () => void;
  loadDemoData: () => void;
  composerOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
  exportBackup: () => void;
  exportCsv: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 演示环境的"网络延迟"，让加载态真实可见 */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  /** 彻底删除时跳过下一次落盘，否则空状态又会被写回去 */
  const skipSaveRef = useRef(false);

  // 首次挂载读本地快照
  useEffect(() => {
    const s = store.load();
    setUser(s.user);
    setAccounts(s.accounts);
    setTxns(s.txns);
    setReady(true);
  }, []);

  // 任何变更都落盘；ready 之前不写，避免用空状态覆盖已有数据
  useEffect(() => {
    if (!ready) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    store.save({ version: 3, user, accounts, txns });
  }, [ready, user, accounts, txns]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const mail = email.trim().toLowerCase();
    if (!name.trim()) return '请填写昵称';
    if (!EMAIL_RE.test(mail)) return '邮箱格式不对，检查一下';
    if (password.length < 6) return '密码至少 6 位';
    await delay(620);
    // Demo：不落密码，注册成功即视为已登录，并预置一份示例数据
    const seed = store.seedAll();
    setUser({
      name: name.trim(),
      email: mail,
      budget: 6000,
      joinedAt: Date.now(),
      avatar: 'initial',
      homeModules: DEFAULT_MODULES.map((m) => ({ ...m })),
      ai: { ...DEFAULT_AI },
    });
    setAccounts(seed.accounts);
    setTxns(seed.txns);
    return null;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const mail = email.trim().toLowerCase();
      if (!EMAIL_RE.test(mail)) return '邮箱格式不对，检查一下';
      if (password.length < 6) return '密码至少 6 位';
      await delay(560);
      setUser((prev) => {
        if (prev) return prev;
        const prefix = mail.split('@')[0];
        return {
          // 演示账号给个像人的名字，不然首页会问候 "下午好，demo"
          name: prefix === 'demo' ? '小林' : prefix,
          email: mail,
          budget: 6000,
          joinedAt: Date.now(),
          avatar: 'initial',
          homeModules: DEFAULT_MODULES.map((m) => ({ ...m })),
          ai: { ...DEFAULT_AI },
        };
      });
      // 首次登录没有账户时补一份示例，否则进首页是空的
      if (accounts.length === 0) {
        const seed = store.seedAll();
        setAccounts(seed.accounts);
        setTxns((prev) => (prev.length > 0 ? prev : seed.txns));
      }
      return null;
    },
    [accounts.length]
  );

  const logout = useCallback(() => {
    setUser(null);
    setComposerOpen(false);
  }, []);

  const addTxn = useCallback((t: Omit<Txn, 'id' | 'createdAt'>) => {
    const item: Txn = {
      ...t,
      id: uid('t'),
      createdAt: Date.now(),
    };
    setTxns((prev) => [item, ...prev]);
  }, []);

  const removeTxn = useCallback((id: string) => {
    setTxns((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addAccount = useCallback((a: Omit<Account, 'id' | 'createdAt'>) => {
    const id = uid('acc');
    setAccounts((prev) => [...prev, { ...a, id, createdAt: Date.now() }]);
    return id;
  }, []);

  const updateAccount = useCallback(
    (id: string, patch: Partial<Omit<Account, 'id' | 'createdAt'>>) => {
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    },
    []
  );

  const setAccountBalance = useCallback(
    (id: string, target: number) => {
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          // 当前余额 = 期初 + 净流水 → 期初 = 目标 − 净流水
          const opening = Math.round((target - netOf(id, txns)) * 100) / 100;
          return { ...a, openingBalance: opening };
        })
      );
    },
    [txns]
  );

  const removeAccount = useCallback(
    (id: string) => {
      if (accounts.length <= 1) {
        return { ok: false, error: '至少要保留一个账户' };
      }
      const fallback = accounts.find((a) => a.id !== id);
      if (!fallback) return { ok: false, error: '找不到可迁移的账户' };
      // 账户下的流水不删，迁移到剩下的第一个账户，避免账目凭空消失
      setTxns((prev) =>
        prev.map((t) => (t.accountId === id ? { ...t, accountId: fallback.id } : t))
      );
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      return { ok: true };
    },
    [accounts]
  );

  const setBudget = useCallback((n: number) => {
    setUser((prev) => (prev ? { ...prev, budget: Math.max(0, Math.round(n)) } : prev));
  }, []);

  const updateProfile = useCallback((patch: Partial<Pick<User, 'name' | 'avatar'>>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const setHomeModules = useCallback((list: HomeModule[]) => {
    setUser((prev) => (prev ? { ...prev, homeModules: list } : prev));
  }, []);

  const setAi = useCallback((cfg: AiConfig) => {
    setUser((prev) => (prev ? { ...prev, ai: cfg } : prev));
  }, []);

  const wipeAll = useCallback(() => {
    skipSaveRef.current = true;
    store.clearAll();
    setUser(null);
    setAccounts([]);
    setTxns([]);
    setComposerOpen(false);
  }, []);

  const clearTxns = useCallback(() => setTxns([]), []);

  const loadDemoData = useCallback(() => {
    const seed = store.seedAll();
    setAccounts(seed.accounts);
    setTxns(seed.txns);
  }, []);

  const exportBackup = useCallback(() => {
    store.exportJSON({ version: 2, user, accounts, txns });
  }, [user, accounts, txns]);

  const exportCsv = useCallback(() => {
    const nameOf = new Map(accounts.map((a) => [a.id, a.name]));
    store.exportCSV(
      txns.map((t) => ({
        date: t.date,
        type: t.type,
        category: getCategory(t.category).label,
        account: nameOf.get(t.accountId) ?? getAccountType('alipay').label,
        note: t.note,
        amount: t.amount,
      }))
    );
  }, [txns, accounts]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      user,
      accounts,
      txns,
      register,
      login,
      logout,
      addTxn,
      removeTxn,
      addAccount,
      updateAccount,
      setAccountBalance,
      removeAccount,
      setBudget,
      updateProfile,
      setHomeModules,
      setAi,
      wipeAll,
      clearTxns,
      loadDemoData,
      composerOpen,
      openComposer: () => setComposerOpen(true),
      closeComposer: () => setComposerOpen(false),
      exportBackup,
      exportCsv,
    }),
    [
      ready,
      user,
      accounts,
      txns,
      register,
      login,
      logout,
      addTxn,
      removeTxn,
      addAccount,
      updateAccount,
      setAccountBalance,
      removeAccount,
      setBudget,
      updateProfile,
      setHomeModules,
      setAi,
      wipeAll,
      clearTxns,
      loadDemoData,
      composerOpen,
      exportBackup,
      exportCsv,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用');
  return ctx;
}
