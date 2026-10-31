import { getAccountType } from '../lib/accounts';
import type { AccountType } from '../lib/types';

const GLYPHS: Record<AccountType, JSX.Element> = {
  alipay: (
    <>
      <rect x="3" y="6.4" width="18" height="13" rx="3" />
      <path d="M3 10.6h18" />
      <circle cx="16.8" cy="15.2" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  wechat: (
    <>
      <path d="M12 4.4c4.2 0 7.6 2.6 7.6 5.9 0 3.2-3.4 5.8-7.6 5.8-.8 0-1.6-.1-2.3-.3L5.2 18l1-3.4a5.6 5.6 0 0 1-1.8-4.3c0-3.3 3.4-5.9 7.6-5.9z" />
      <circle cx="9.6" cy="10" r=".9" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="10" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  bank: (
    <>
      <rect x="2.8" y="5.4" width="18.4" height="13.4" rx="2.6" />
      <path d="M2.8 9.8h18.4M6.4 14.8h4.2" />
    </>
  ),
  cash: (
    <>
      <rect x="2.8" y="6.4" width="18.4" height="11.2" rx="2.4" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 10v4M18 10v4" />
    </>
  ),
};

export function AccountGlyph({
  type,
  size = 18,
  color,
}: {
  type: AccountType;
  size?: number;
  color?: string;
}) {
  const def = getAccountType(type);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: color ?? def.color }}
    >
      {GLYPHS[type]}
    </svg>
  );
}
