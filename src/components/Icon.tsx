import type { SVGProps } from 'react';

type IconName =
  | 'home'
  | 'list'
  | 'sparkle'
  | 'user'
  | 'plus'
  | 'search'
  | 'trash'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'mail'
  | 'lock'
  | 'eye'
  | 'eyeOff'
  | 'check'
  | 'alert'
  | 'logout'
  | 'download'
  | 'sliders'
  | 'close'
  | 'wallet'
  | 'arrowUp'
  | 'arrowDown'
  | 'minimize'
  | 'calendar'
  | 'refresh'
  | 'shield'
  | 'info'
  | 'bolt'
  | 'pin'
  | 'grip'
  | 'camera'
  | 'chevronUp'
  | 'spark';

const PATHS: Record<IconName, JSX.Element> = {
  home: (
    <>
      <path d="M3.5 10.4 12 3.6l8.5 6.8V19a1.6 1.6 0 0 1-1.6 1.6h-3.6V14H8.7v6.6H5.1A1.6 1.6 0 0 1 3.5 19z" />
    </>
  ),
  list: (
    <>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <circle cx="4.6" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.2 13.9 9l5.8 1.9-5.8 1.9L12 18.6l-1.9-5.8L4.3 10.9 10.1 9z" />
      <path d="M18.6 16.4 19.5 19l2.6.9-2.6.9-.9 2.6" transform="translate(-1.6 -2.2) scale(.62)" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="3.9" />
      <path d="M4.4 20.4c.6-3.7 3.8-5.6 7.6-5.6s7 1.9 7.6 5.6" />
    </>
  ),
  plus: <path d="M12 5.2v13.6M5.2 12h13.6" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.6" />
      <path d="M15.8 15.8 20.4 20.4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.4 7V5.2a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2V7" />
      <path d="M6.4 7 7.3 19.4a1.3 1.3 0 0 0 1.3 1.2h6.8a1.3 1.3 0 0 0 1.3-1.2L17.6 7" />
    </>
  ),
  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  chevronLeft: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevronDown: <path d="M5.5 9 12 15.5 18.5 9" />,
  mail: (
    <>
      <rect x="2.8" y="5" width="18.4" height="14" rx="2.6" />
      <path d="M3.6 7.2 12 13l8.4-5.8" />
    </>
  ),
  lock: (
    <>
      <rect x="4.2" y="10.2" width="15.6" height="10.6" rx="2.6" />
      <path d="M8 10.2V7.4a4 4 0 0 1 8 0v2.8" />
    </>
  ),
  eye: (
    <>
      <path d="M2.4 12S6 5.6 12 5.6 21.6 12 21.6 12 18 18.4 12 18.4 2.4 12 2.4 12z" />
      <circle cx="12" cy="12" r="2.9" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 6.1A9.7 9.7 0 0 1 12 5.6c6 0 9.6 6.4 9.6 6.4a17 17 0 0 1-2.6 3.5" />
      <path d="M6.4 7.7A16.6 16.6 0 0 0 2.4 12s3.6 6.4 9.6 6.4c1.5 0 2.9-.4 4.1-1" />
      <path d="M9.6 9.8a3 3 0 0 0 4.3 4.2" />
    </>
  ),
  check: <path d="M4.8 12.6 9.4 17.2 19.2 6.8" />,
  alert: (
    <>
      <path d="M12 3.8 21.2 20H2.8z" />
      <path d="M12 9.6v4.6M12 17.2v.02" />
    </>
  ),
  logout: (
    <>
      <path d="M14.6 4.4h3a2 2 0 0 1 2 2v11.2a2 2 0 0 1-2 2h-3" />
      <path d="M9.6 8.4 6 12l3.6 3.6M6 12h9" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.6v11.2M8.2 11.4 12 15.2l3.8-3.8" />
      <path d="M4.4 19.6h15.2" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7.5h6M15 7.5h5M4 16.5h5M14 16.5h6" />
      <circle cx="12.4" cy="7.5" r="2.1" />
      <circle cx="11.4" cy="16.5" r="2.1" />
    </>
  ),
  close: <path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8" />,
  wallet: (
    <>
      <rect x="2.8" y="6" width="18.4" height="13" rx="3" />
      <path d="M2.8 10.2h18.4" />
      <circle cx="16.6" cy="14.6" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  minimize: <path d="M5 12h14" />,
  calendar: (
    <>
      <rect x="3.4" y="5.2" width="17.2" height="15.4" rx="2.6" />
      <path d="M3.4 10h17.2M8.2 3.2v3.6M15.8 3.2v3.6" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20.4 4.4v4.4H16" />
    </>
  ),
  shield: <path d="M12 3.2 19.6 6v5.6c0 4.4-3.2 7.6-7.6 9.2-4.4-1.6-7.6-4.8-7.6-9.2V6z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11v5.4M12 7.9v.02" />
    </>
  ),
  bolt: <path d="M13.4 3 5.6 13.4h5.2L10.6 21l7.8-10.4h-5.2z" />,
  pin: (
    <>
      <path d="M12 21s7-5.6 7-11.2A7 7 0 1 0 5 9.8C5 15.4 12 21 12 21z" />
      <circle cx="12" cy="9.6" r="2.6" />
    </>
  ),
  grip: (
    <>
      {[7, 12, 17].map((y) => (
        <g key={y}>
          <circle cx="9.2" cy={y} r="1.35" fill="currentColor" stroke="none" />
          <circle cx="14.8" cy={y} r="1.35" fill="currentColor" stroke="none" />
        </g>
      ))}
    </>
  ),
  camera: (
    <>
      <path d="M3.4 8.8h3.2L8.3 6h7.4l1.7 2.8h3.2a1.6 1.6 0 0 1 1.6 1.6v8a1.6 1.6 0 0 1-1.6 1.6H3.4a1.6 1.6 0 0 1-1.6-1.6v-8a1.6 1.6 0 0 1 1.6-1.6z" />
      <circle cx="12" cy="14.4" r="3.4" />
    </>
  ),
  chevronUp: <path d="M5.5 15 12 8.5 18.5 15" />,
  spark: <path d="M4 16.2 9.2 11l3.4 3.4L20 7.2M15.4 7.2H20v4.6" />,
};

export function Icon({
  name,
  size = 20,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
