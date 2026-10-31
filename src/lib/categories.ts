import type { TxnType } from './types';

export interface CategoryDef {
  key: string;
  label: string;
  type: TxnType;
  /** 图表 / 图标色 */
  color: string;
}

/** 图表可用的 8 个槽位，分类按序循环取色，相邻分类不会撞色 */
const PALETTE = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)'];

/** 分类是数据字典，新增一个分类只需要在这里加一行 + 一个图标 */
const RAW_EXPENSE: Omit<CategoryDef, 'color'>[] = [
  { key: 'food', label: '餐饮', type: 'expense' },
  { key: 'grocery', label: '买菜', type: 'expense' },
  { key: 'transport', label: '交通', type: 'expense' },
  { key: 'shopping', label: '购物', type: 'expense' },
  { key: 'clothing', label: '服饰', type: 'expense' },
  { key: 'housing', label: '居住', type: 'expense' },
  { key: 'utility', label: '水电', type: 'expense' },
  { key: 'telecom', label: '通讯', type: 'expense' },
  { key: 'fun', label: '娱乐', type: 'expense' },
  { key: 'travel', label: '旅行', type: 'expense' },
  { key: 'health', label: '医疗', type: 'expense' },
  { key: 'study', label: '学习', type: 'expense' },
  { key: 'social', label: '人情', type: 'expense' },
  { key: 'digital', label: '数码', type: 'expense' },
  { key: 'pet', label: '宠物', type: 'expense' },
  { key: 'fitness', label: '运动', type: 'expense' },
  { key: 'subscription', label: '订阅', type: 'expense' },
  { key: 'other', label: '其他', type: 'expense' },
];

const RAW_INCOME: Omit<CategoryDef, 'color'>[] = [
  { key: 'salary', label: '工资', type: 'income' },
  { key: 'bonus', label: '奖金', type: 'income' },
  { key: 'side', label: '副业', type: 'income' },
  { key: 'invest', label: '理财', type: 'income' },
  { key: 'gift', label: '红包', type: 'income' },
  { key: 'refund', label: '退款', type: 'income' },
  { key: 'other_in', label: '其他', type: 'income' },
];

const withColor = (list: Omit<CategoryDef, 'color'>[]): CategoryDef[] =>
  list.map((c, i) => ({ ...c, color: PALETTE[i % PALETTE.length] }));

export const EXPENSE_CATEGORIES: CategoryDef[] = withColor(RAW_EXPENSE);
export const INCOME_CATEGORIES: CategoryDef[] = withColor(RAW_INCOME);

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const MAP = new Map(ALL_CATEGORIES.map((c) => [c.key, c]));

export function getCategory(key: string): CategoryDef {
  return MAP.get(key) ?? { key, label: key, type: 'expense', color: 'var(--c8)' };
}

export function categoriesOf(type: TxnType): CategoryDef[] {
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}
