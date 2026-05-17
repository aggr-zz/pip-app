type Color = 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name: string;
  color?: Color;
  size?: Size;
}

const GRADIENTS: Record<Color, string> = {
  coral: 'linear-gradient(135deg, #FFB997, #EE6C4D)',
  mint: 'linear-gradient(135deg, #95D5B2, #5BA890)',
  ink: 'linear-gradient(135deg, #3D4663, #1B2238)',
  gold: 'linear-gradient(135deg, #FFE39A, #D4A12E)',
  rose: 'linear-gradient(135deg, #FFC1CC, #E27396)',
  sky: 'linear-gradient(135deg, #B3DCFA, #5B85C9)',
};

const SIZES: Record<Size, { px: number; fs: number }> = {
  xs: { px: 24, fs: 10 },
  sm: { px: 32, fs: 12 },
  md: { px: 40, fs: 14 },
  lg: { px: 56, fs: 20 },
  xl: { px: 80, fs: 28 },
};

/**
 * Аватар пользователя: круг с градиентом и первой буквой имени.
 * Цвет градиента закрепляется за профилем при создании.
 */
export function Avatar({ name, color = 'coral', size = 'md' }: AvatarProps) {
  const initial = name?.[0]?.toUpperCase() ?? '?';
  const { px, fs } = SIZES[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: px,
        height: px,
        borderRadius: '100px',
        background: GRADIENTS[color],
        color: color === 'gold' ? 'var(--color-ink)' : 'white',
        fontWeight: 700,
        fontSize: fs,
        fontFamily: 'var(--font-display)',
        flexShrink: 0,
      }}
      aria-label={name}
    >
      {initial}
    </span>
  );
}
