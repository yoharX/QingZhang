interface AvatarProps {
  name: string;
  /** 'initial' | 'g1'..'g6' | dataURL */
  avatar?: string;
  size?: number;
  className?: string;
}

export function initialsOf(name: string): string {
  const n = (name || '').trim();
  if (!n) return 'U';
  if (/[\u4e00-\u9fa5]/.test(n)) return n.slice(-2);
  return n.slice(0, 2).toUpperCase();
}

interface Preset {
  id: string;
  from: string;
  to: string;
  shape: 'ring' | 'wave' | 'dot' | 'square' | 'triangle' | 'arc';
}

export const AVATAR_PRESETS: Preset[] = [
  { id: 'g1', from: 'var(--c1)', to: 'var(--c3)', shape: 'ring' },
  { id: 'g2', from: 'var(--c4)', to: 'var(--c6)', shape: 'wave' },
  { id: 'g3', from: 'var(--c2)', to: 'var(--brand-mist)', shape: 'dot' },
  { id: 'g4', from: 'var(--c5)', to: 'var(--c8)', shape: 'square' },
  { id: 'g5', from: 'var(--c7)', to: 'var(--c3)', shape: 'triangle' },
  { id: 'g6', from: 'var(--c6)', to: 'var(--c4)', shape: 'arc' },
];

function PresetShape({ shape }: { shape: Preset['shape'] }) {
  const stroke = 'rgba(255,255,255,0.92)';
  switch (shape) {
    case 'ring':
      return <circle cx="24" cy="24" r="9" fill="none" stroke={stroke} strokeWidth="3.4" />;
    case 'wave':
      return (
        <path
          d="M12 27c3-6 6-6 9 0s6 6 9 0 6-6 9 0"
          fill="none"
          stroke={stroke}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      );
    case 'dot':
      return (
        <>
          <circle cx="18" cy="20" r="3.2" fill={stroke} />
          <circle cx="30" cy="20" r="3.2" fill={stroke} />
          <circle cx="24" cy="30" r="3.2" fill={stroke} />
        </>
      );
    case 'square':
      return (
        <rect x="16" y="16" width="16" height="16" rx="4" fill="none" stroke={stroke} strokeWidth="3.2" />
      );
    case 'triangle':
      return <path d="M24 15 34 32H14z" fill="none" stroke={stroke} strokeWidth="3.2" strokeLinejoin="round" />;
    case 'arc':
      return (
        <path
          d="M15 29a9 9 0 0 1 18 0"
          fill="none"
          stroke={stroke}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      );
    default:
      return null;
  }
}

export function Avatar({ name, avatar = 'initial', size = 32, className = '' }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };

  if (avatar && avatar.startsWith('data:')) {
    return (
      <span className={`avatar avatar-img ${className}`} style={style}>
        <img src={avatar} alt={name} />
      </span>
    );
  }

  const preset = AVATAR_PRESETS.find((p) => p.id === avatar);
  if (preset) {
    return (
      <span className={`avatar avatar-preset ${className}`} style={style}>
        <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
          <defs>
            <linearGradient id={`av-${preset.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={preset.from} />
              <stop offset="100%" stopColor={preset.to} />
            </linearGradient>
          </defs>
          <rect width="48" height="48" fill={`url(#av-${preset.id})`} />
          <PresetShape shape={preset.shape} />
        </svg>
      </span>
    );
  }

  return (
    <span className={`avatar ${className}`} style={style}>
      {initialsOf(name)}
    </span>
  );
}
