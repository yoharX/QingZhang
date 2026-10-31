export type TxnType = 'expense' | 'income';

export type AccountType = 'alipay' | 'wechat' | 'bank' | 'cash';

export interface Account {
  id: string;
  type: AccountType;
  /** 显示名。银行卡由用户从银行列表选或自行填写 */
  name: string;
  /** 银行标识，仅 type === 'bank' 时有值 */
  bankCode?: string;
  /** 期初余额。当前余额 = 期初 + 该账户所有收入 − 所有支出 */
  openingBalance: number;
  createdAt: number;
}

export interface Txn {
  id: string;
  type: TxnType;
  amount: number;
  category: string;
  note: string;
  /** YYYY-MM-DD */
  date: string;
  /** 关联账户 id */
  accountId: string;
  createdAt: number;
}

/** 首页板块，顺序即数组顺序 */
export interface HomeModule {
  key: HomeModuleKey;
  visible: boolean;
}

export type HomeModuleKey =
  | 'weather'
  | 'accounts'
  | 'budget'
  | 'category'
  | 'week'
  | 'recent';

export type AiMode = 'local' | 'remote';

export interface AiConfig {
  mode: AiMode;
  /** OpenAI 兼容接口，填到 /v1 这一层 */
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface User {
  name: string;
  email: string;
  /** 月度预算，0 表示不设 */
  budget: number;
  joinedAt: number;
  /** 'initial' | 'g1'..'g6' | dataURL */
  avatar?: string;
  homeModules?: HomeModule[];
  ai?: AiConfig;
}

export interface PersistedState {
  version: number;
  user: User | null;
  accounts: Account[];
  txns: Txn[];
}
