import type { HomeModule, HomeModuleKey } from './types';

export interface ModuleMeta {
  key: HomeModuleKey;
  label: string;
  desc: string;
}

/** 首页可配置板块。顺序即默认顺序，hero 主卡固定不可配置 */
export const HOME_MODULES: ModuleMeta[] = [
  { key: 'weather', label: '天气', desc: '当前城市天气与体感' },
  { key: 'accounts', label: '账户', desc: '各账户余额与总资产' },
  { key: 'budget', label: '预算', desc: '本月预算使用进度' },
  { key: 'category', label: '分类占比', desc: '钱花在了哪几类' },
  { key: 'week', label: '近 7 天', desc: '最近一周每日支出' },
  { key: 'recent', label: '最近记录', desc: '最新几笔流水' },
];

export const DEFAULT_MODULES: HomeModule[] = HOME_MODULES.map((m) => ({
  key: m.key,
  visible: true,
}));

const KNOWN = new Set(HOME_MODULES.map((m) => m.key));

/** 补齐新增板块、剔除失效 key、保持用户设定的顺序 */
export function normalizeModules(list?: HomeModule[]): HomeModule[] {
  if (!Array.isArray(list) || list.length === 0) return DEFAULT_MODULES.map((m) => ({ ...m }));
  const seen = new Set<string>();
  const out: HomeModule[] = [];
  for (const item of list) {
    if (!item || !KNOWN.has(item.key) || seen.has(item.key)) continue;
    seen.add(item.key);
    out.push({ key: item.key, visible: item.visible !== false });
  }
  // 后来新增的板块追加到末尾，默认显示
  for (const meta of HOME_MODULES) {
    if (!seen.has(meta.key)) out.push({ key: meta.key, visible: true });
  }
  return out;
}

export function moduleMeta(key: HomeModuleKey): ModuleMeta {
  return HOME_MODULES.find((m) => m.key === key) ?? HOME_MODULES[0];
}
