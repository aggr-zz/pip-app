// ─── Иконки категорий задач ──────────────────────────────────────────
// 12 категорий из дизайн-системы. Стиль: 2px stroke, скруглённые концы,
// 24×24 viewport, currentColor.

export const TASK_ICONS = [
  'hygiene',
  'bedroom',
  'school',
  'cleaning',
  'kitchen',
  'plants',
  'trash',
  'sport',
  'reading',
  'pet',
  'music',
  'clock',
] as const;

export type TaskIconName = (typeof TASK_ICONS)[number];

// Цветовая закреплённость иконки за категорией (из дизайн-системы)
export const ICON_COLORS: Record<TaskIconName, { bg: string; fg: string }> = {
  hygiene:  { bg: 'var(--color-coral-soft)', fg: 'var(--color-coral-deep)' },
  bedroom:  { bg: 'var(--color-mint-soft)',  fg: 'var(--color-mint-deep)' },
  school:   { bg: 'var(--color-gold-soft)',  fg: 'var(--color-gold-deep)' },
  cleaning: { bg: '#E6E8EE',                 fg: 'var(--color-ink-2)' },
  kitchen:  { bg: 'var(--color-coral-soft)', fg: 'var(--color-coral-deep)' },
  plants:   { bg: 'var(--color-mint-soft)',  fg: 'var(--color-mint-deep)' },
  trash:    { bg: '#E6E8EE',                 fg: 'var(--color-ink-2)' },
  sport:    { bg: 'var(--color-gold-soft)',  fg: 'var(--color-gold-deep)' },
  reading:  { bg: 'var(--color-coral-soft)', fg: 'var(--color-coral-deep)' },
  pet:      { bg: 'var(--color-mint-soft)',  fg: 'var(--color-mint-deep)' },
  music:    { bg: 'var(--color-gold-soft)',  fg: 'var(--color-gold-deep)' },
  clock:    { bg: '#E6E8EE',                 fg: 'var(--color-ink-2)' },
};

export const ICON_LABELS: Record<TaskIconName, string> = {
  hygiene: 'Гигиена',
  bedroom: 'Спальня',
  school: 'Учёба',
  cleaning: 'Уборка',
  kitchen: 'Кухня',
  plants: 'Растения',
  trash: 'Мусор',
  sport: 'Спорт',
  reading: 'Чтение',
  pet: 'Питомец',
  music: 'Музыка',
  clock: 'По времени',
};

function IconSvg({ name, size = 24 }: { name: TaskIconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'hygiene':
      return (
        <svg {...common}>
          <path d="M12 3v6M9 5l3 4 3-4M8 9c-2 0-3 1.5-3 4v6c0 1 1 2 2 2h10c1 0 2-1 2-2v-6c0-2.5-1-4-3-4z" />
        </svg>
      );
    case 'bedroom':
      return (
        <svg {...common}>
          <rect x="3" y="11" width="18" height="6" rx="1" />
          <path d="M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4" />
          <path d="M3 17v3M21 17v3" />
        </svg>
      );
    case 'school':
      return (
        <svg {...common}>
          <path d="M4 19V5a2 2 0 012-2h12a2 2 0 012 2v14l-4-3-4 3-4-3-4 3z" />
        </svg>
      );
    case 'cleaning':
      return (
        <svg {...common}>
          <path d="M3 21l4-4M7 17l3-7 5-2 5 5-2 5-7 3z" />
          <path d="M14 3l3 3" />
        </svg>
      );
    case 'kitchen':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case 'plants':
      return (
        <svg {...common}>
          <path d="M12 22c0-7 5-12 10-12-3 0-10 3-10 12z" />
          <path d="M22 10c-3 1-7 4-10 12-1-4-1-9 4-12 3-2 6-1 6 0z" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        </svg>
      );
    case 'sport':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="M6 8l4 4M14 12l4 4M8 6l8 12" />
        </svg>
      );
    case 'reading':
      return (
        <svg {...common}>
          <path d="M3 5v14a2 2 0 002 2h6V3H5a2 2 0 00-2 2zM13 3v18h6a2 2 0 002-2V5a2 2 0 00-2-2z" />
        </svg>
      );
    case 'pet':
      return (
        <svg {...common}>
          <circle cx="6" cy="8" r="2" />
          <circle cx="12" cy="6" r="2" />
          <circle cx="18" cy="8" r="2" />
          <circle cx="9" cy="13" r="1.5" />
          <circle cx="15" cy="13" r="1.5" />
          <path d="M8 17c0 2 2 4 4 4s4-2 4-4-2-3-4-3-4 1-4 3z" />
        </svg>
      );
    case 'music':
      return (
        <svg {...common}>
          <path d="M9 17V5l10-2v12" />
          <circle cx="6" cy="17" r="3" />
          <circle cx="16" cy="15" r="3" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
  }
}

interface TaskIconProps {
  name: TaskIconName;
  size?: number;       // ширина бэйджа
  iconSize?: number;   // размер самой иконки
  colored?: boolean;   // true (по умолчанию) — цветной фон; false — прозрачный
}

/**
 * Иконка задачи в цветном квадрате (как в дизайн-системе).
 * Используется в строках задач, формах, чипах и т.д.
 */
export function TaskIcon({ name, size = 38, iconSize, colored = true }: TaskIconProps) {
  const colors = ICON_COLORS[name];
  const innerSize = iconSize ?? Math.round(size * 0.55);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 'var(--radius-md)',
        background: colored ? colors.bg : 'transparent',
        color: colored ? colors.fg : 'var(--text-soft)',
        flexShrink: 0,
      }}
    >
      <IconSvg name={name} size={innerSize} />
    </span>
  );
}
