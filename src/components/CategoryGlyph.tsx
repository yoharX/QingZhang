import { getCategory } from '../lib/categories';

const GLYPHS: Record<string, JSX.Element> = {
  food: (
    <>
      <path d="M3.4 11.6h17.2a8.6 8.6 0 0 1-17.2 0z" />
      <path d="M8.6 8.4c0-1.3 1.1-1.7 1.1-3M12 8.4c0-1.3 1.1-1.7 1.1-3M15.4 8.4c0-1.3 1.1-1.7 1.1-3" />
    </>
  ),
  grocery: (
    <>
      <path d="M4 9.4h16l-1.5 10a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7z" />
      <path d="M8.8 9.4 12 3.8l3.2 5.6M9.4 13.2v4M14.6 13.2v4" />
    </>
  ),
  transport: (
    <>
      <rect x="4" y="4.6" width="16" height="12" rx="2.8" />
      <path d="M4 11.4h16M8 16.6v2M16 16.6v2" />
      <circle cx="8.6" cy="13.6" r=".9" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="13.6" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  shopping: (
    <>
      <path d="M5.6 8h12.8l1 12.2H4.6z" />
      <path d="M9 8.4V6.6a3 3 0 0 1 6 0v1.8" />
    </>
  ),
  clothing: (
    <>
      <path d="M8.6 4.4 4.2 6.8l1.8 4 2.2-1v9.4h7.6V9.8l2.2 1 1.8-4-4.4-2.4a3.6 3.6 0 0 1-7.2 0z" />
    </>
  ),
  housing: (
    <>
      <path d="M3.8 10.6 12 4l8.2 6.6V19a1.4 1.4 0 0 1-1.4 1.4h-3.4v-5.6H8.6v5.6H5.2A1.4 1.4 0 0 1 3.8 19z" />
    </>
  ),
  utility: (
    <>
      <path d="M12 3.4c3.4 3.6 6 6.6 6 9.6a6 6 0 0 1-12 0c0-3 2.6-6 6-9.6z" />
      <path d="M9.4 14.2a2.6 2.6 0 0 0 2.6 2.6" />
    </>
  ),
  telecom: (
    <>
      <rect x="6.4" y="2.8" width="11.2" height="18.4" rx="2.8" />
      <path d="M10.4 18.2h3.2" />
    </>
  ),
  fun: (
    <>
      <rect x="3" y="5.4" width="18" height="13.2" rx="2.6" />
      <path d="M8 5.4v13.2M16 5.4v13.2M3 12h18" />
    </>
  ),
  travel: (
    <>
      <rect x="4" y="7" width="16" height="12.8" rx="2.4" />
      <path d="M9 7V4.8h6V7M8.8 19.8V21.6M15.2 19.8V21.6M9 11h6" />
    </>
  ),
  health: (
    <>
      <path d="M12 20.2s-7.6-4.4-7.6-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.6 3c0 5-7.6 9.4-7.6 9.4z" />
    </>
  ),
  study: (
    <>
      <path d="M4.2 5.2A1.8 1.8 0 0 1 6 3.4h13.2v17.2H6a1.8 1.8 0 0 0-1.8 1.8z" />
      <path d="M8 7.6h6" />
    </>
  ),
  social: (
    <>
      <rect x="3.4" y="9" width="17.2" height="11.2" rx="1.8" />
      <path d="M3.4 12.8h17.2M12 9v11.2" />
      <path d="M12 9S10.6 4.4 8.4 4.4a2.2 2.2 0 0 0 0 4.6zM12 9s1.4-4.6 3.6-4.6a2.2 2.2 0 0 1 0 4.6z" />
    </>
  ),
  digital: (
    <>
      <rect x="3" y="4.4" width="18" height="12.2" rx="2.2" />
      <path d="M8.6 20h6.8M12 16.6V20" />
    </>
  ),
  pet: (
    <>
      <ellipse cx="7.2" cy="9.4" rx="1.9" ry="2.5" />
      <ellipse cx="12" cy="7.2" rx="1.9" ry="2.7" />
      <ellipse cx="16.8" cy="9.4" rx="1.9" ry="2.5" />
      <path d="M12 12.2c3 0 5.3 2 5.3 4.3 0 1.7-1.5 2.9-3.1 2.9-1 0-1.5-.4-2.2-.4s-1.2.4-2.2.4c-1.6 0-3.1-1.2-3.1-2.9 0-2.3 2.3-4.3 5.3-4.3z" />
    </>
  ),
  fitness: (
    <>
      <path d="M3 9.6v4.8M6.4 7.4v9.2M17.6 7.4v9.2M21 9.6v4.8M6.4 12h11.2" />
    </>
  ),
  subscription: (
    <>
      <path d="M4 12a8 8 0 0 1 13.6-5.7M20 12a8 8 0 0 1-13.6 5.7" />
      <path d="M17.8 3.4v4.2h-4.2M6.2 20.6v-4.2h4.2" />
    </>
  ),
  other: (
    <>
      <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  salary: (
    <>
      <rect x="2.8" y="6.4" width="18.4" height="11.2" rx="2.4" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6 10v4M18 10v4" />
    </>
  ),
  bonus: (
    <>
      <circle cx="12" cy="9" r="5.2" />
      <path d="M8.8 13.4 7.2 21 12 18.4 16.8 21l-1.6-7.6" />
    </>
  ),
  side: (
    <>
      <rect x="3.2" y="7.2" width="17.6" height="12.6" rx="2.4" />
      <path d="M8.6 7.2V5.4a1.8 1.8 0 0 1 1.8-1.8h3.2a1.8 1.8 0 0 1 1.8 1.8v1.8" />
    </>
  ),
  invest: (
    <>
      <path d="M6 20V12.4M12 20V6M18 20v-5.2" />
      <path d="M3.6 20.4h16.8" />
    </>
  ),
  gift: (
    <>
      <rect x="3.4" y="9" width="17.2" height="11.2" rx="1.8" />
      <path d="M3.4 12.8h17.2M12 9v11.2" />
      <path d="M12 9S10.6 4.4 8.4 4.4a2.2 2.2 0 0 0 0 4.6zM12 9s1.4-4.6 3.6-4.6a2.2 2.2 0 0 1 0 4.6z" />
    </>
  ),
  refund: (
    <>
      <path d="M4 9.8h11.2a4.6 4.6 0 0 1 0 9.2H9.2" />
      <path d="M7.4 6.2 3.8 9.8l3.6 3.6" />
    </>
  ),
  other_in: (
    <>
      <circle cx="12" cy="12" r="7.6" />
      <path d="M12 8.4v7.2M8.4 12h7.2" />
    </>
  ),
};

export function CategoryGlyph({
  category,
  size = 18,
}: {
  category: string;
  size?: number;
}) {
  const def = getCategory(category);
  const glyph = GLYPHS[category] ?? GLYPHS.other;
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
      style={{ color: def.color }}
    >
      {glyph}
    </svg>
  );
}
