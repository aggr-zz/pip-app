type Color = 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name: string;
  color?: Color;
  size?: Size;
  /** Supabase Storage public URL — приоритет над emoji и цветом */
  avatarUrl?: string | null;
  /** Эмодзи-аватар (🦁, 🐯, …) — приоритет над цветом, но ниже фото */
  avatarEmoji?: string | null;
}

const GRADIENTS: Record<Color, string> = {
  coral: 'linear-gradient(135deg, #FFB997, #EE6C4D)',
  mint:  'linear-gradient(135deg, #95D5B2, #5BA890)',
  ink:   'linear-gradient(135deg, #3D4663, #1B2238)',
  gold:  'linear-gradient(135deg, #FFE39A, #D4A12E)',
  rose:  'linear-gradient(135deg, #FFC1CC, #E27396)',
  sky:   'linear-gradient(135deg, #B3DCFA, #5B85C9)',
};

const SIZES: Record<Size, { px: number; fs: number }> = {
  xs: { px: 24, fs: 10 },
  sm: { px: 32, fs: 12 },
  md: { px: 40, fs: 14 },
  lg: { px: 56, fs: 20 },
  xl: { px: 80, fs: 28 },
};

/**
 * Аватар пользователя.
 * Приоритет: фото (avatarUrl) > эмодзи (avatarEmoji) > градиент + инициал.
 */
export function Avatar({
  name,
  color = 'coral',
  size = 'md',
  avatarUrl,
  avatarEmoji,
}: AvatarProps) {
  const { px, fs } = SIZES[size];

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: px,
    height: px,
    borderRadius: '100px',
    flexShrink: 0,
    overflow: 'hidden',
  };

  // ── 1. Фото ──────────────────────────────────────────────────────────
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <span style={baseStyle} aria-label={name}>
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </span>
    );
  }

  // ── 2. Эмодзи ─────────────────────────────────────────────────────────
  if (avatarEmoji) {
    return (
      <span
        style={{
          ...baseStyle,
          background: GRADIENTS[color],
          fontSize: Math.round(px * 0.52),
          lineHeight: 1,
        }}
        aria-label={name}
      >
        {avatarEmoji}
      </span>
    );
  }

  // ── 3. Градиент + инициал (дефолт) ───────────────────────────────────
  const initial = name?.[0]?.toUpperCase() ?? '?';
  return (
    <span
      style={{
        ...baseStyle,
        background: GRADIENTS[color],
        color: color === 'gold' ? 'var(--color-ink)' : 'white',
        fontWeight: 700,
        fontSize: fs,
        fontFamily: 'var(--font-display)',
      }}
      aria-label={name}
    >
      {initial}
    </span>
  );
}
