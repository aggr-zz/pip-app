// ─── Иконки категорий задач ──────────────────────────────────────────────────
// 24 категории. Стиль: 2px stroke, rounded caps/joins, 24×24 viewport.
// Старые 12 имён сохранены для совместимости с БД.

export const TASK_ICONS = [
  // ── Гигиена / утро ──────────────────────────────────────────────────────
  'teeth',       // Зубы
  'hygiene',     // Умывание
  'shower',      // Душ
  'sleep',       // Сон
  // ── Учёба ───────────────────────────────────────────────────────────────
  'school',      // Школа / сборы
  'homework',    // Домашнее задание
  'reading',     // Чтение
  'music',       // Музыка
  // ── Дом ─────────────────────────────────────────────────────────────────
  'cleaning',    // Уборка
  'kitchen',     // Кухня
  'dishes',      // Посуда
  'trash',       // Мусор
  'laundry',     // Стирка
  'cooking',     // Готовка
  // ── Активность ──────────────────────────────────────────────────────────
  'sport',       // Спорт
  'walk',        // Прогулка
  'outdoor',     // На улице
  'meditation',  // Медитация / тишина
  // ── Прочее ──────────────────────────────────────────────────────────────
  'plants',      // Растения
  'pet',         // Питомец
  'creativity',  // Творчество
  'screen',      // Экранное время
  'bedroom',     // Спальня / кровать
  'clock',       // По времени
] as const;

export type TaskIconName = (typeof TASK_ICONS)[number];

// ─── Цвета ────────────────────────────────────────────────────────────────────

export const ICON_COLORS: Record<TaskIconName, { bg: string; fg: string }> = {
  // coral
  teeth:      { bg: 'var(--color-coral-soft)', fg: 'var(--color-coral-deep)' },
  hygiene:    { bg: 'var(--color-coral-soft)', fg: 'var(--color-coral-deep)' },
  shower:     { bg: 'var(--color-coral-soft)', fg: 'var(--color-coral-deep)' },
  kitchen:    { bg: 'var(--color-coral-soft)', fg: 'var(--color-coral-deep)' },
  dishes:     { bg: 'var(--color-coral-soft)', fg: 'var(--color-coral-deep)' },
  creativity: { bg: 'var(--color-coral-soft)', fg: 'var(--color-coral-deep)' },
  cooking:    { bg: 'var(--color-coral-soft)', fg: 'var(--color-coral-deep)' },
  // mint
  sleep:      { bg: 'var(--color-mint-soft)', fg: 'var(--color-mint-deep)' },
  bedroom:    { bg: 'var(--color-mint-soft)', fg: 'var(--color-mint-deep)' },
  plants:     { bg: 'var(--color-mint-soft)', fg: 'var(--color-mint-deep)' },
  pet:        { bg: 'var(--color-mint-soft)', fg: 'var(--color-mint-deep)' },
  walk:       { bg: 'var(--color-mint-soft)', fg: 'var(--color-mint-deep)' },
  outdoor:    { bg: 'var(--color-mint-soft)', fg: 'var(--color-mint-deep)' },
  // gold
  school:     { bg: 'var(--color-gold-soft)', fg: 'var(--color-gold-deep)' },
  homework:   { bg: 'var(--color-gold-soft)', fg: 'var(--color-gold-deep)' },
  reading:    { bg: 'var(--color-gold-soft)', fg: 'var(--color-gold-deep)' },
  music:      { bg: 'var(--color-gold-soft)', fg: 'var(--color-gold-deep)' },
  sport:      { bg: 'var(--color-gold-soft)', fg: 'var(--color-gold-deep)' },
  meditation: { bg: 'var(--color-gold-soft)', fg: 'var(--color-gold-deep)' },
  // neutral
  cleaning:   { bg: '#EAEDF3', fg: '#4A5066' },
  trash:      { bg: '#EAEDF3', fg: '#4A5066' },
  laundry:    { bg: '#EAEDF3', fg: '#4A5066' },
  clock:      { bg: '#EAEDF3', fg: '#4A5066' },
  screen:     { bg: '#EAEDF3', fg: '#4A5066' },
};

export const ICON_LABELS: Record<TaskIconName, string> = {
  teeth:      'Зубы',
  hygiene:    'Умывание',
  shower:     'Душ',
  sleep:      'Сон',
  school:     'Школа',
  homework:   'Домашка',
  reading:    'Чтение',
  music:      'Музыка',
  cleaning:   'Уборка',
  kitchen:    'Кухня',
  dishes:     'Посуда',
  trash:      'Мусор',
  laundry:    'Стирка',
  cooking:    'Готовка',
  sport:      'Спорт',
  walk:       'Прогулка',
  outdoor:    'Улица',
  meditation: 'Тишина',
  plants:     'Растения',
  pet:        'Питомец',
  creativity: 'Творчество',
  screen:     'Экран',
  bedroom:    'Спальня',
  clock:      'По времени',
};

// ─── SVG иконки ───────────────────────────────────────────────────────────────

function IconSvg({ name, size = 24 }: { name: TaskIconName; size?: number }) {
  const s = {
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

    // ── Зубы: зуб с корнем ───────────────────────────────────────────────
    case 'teeth':
      return (
        <svg {...s}>
          <path d="M9.5 3C8 3 7 4 7 5.5c0 2 .5 4 1 6L8.5 16c0 2.5 1.5 5 3.5 5s3.5-2.5 3.5-5L16 11.5c.5-2 1-4 1-6C17 4 16 3 14.5 3c-1 0-1.5.5-2.5.5S10.5 3 9.5 3z" />
          <path d="M9.5 8.5c.5-1.5 5-1.5 5 0" strokeOpacity=".4" />
        </svg>
      );

    // ── Умывание: руки под каплями ───────────────────────────────────────
    case 'hygiene':
      return (
        <svg {...s}>
          <path d="M8 17.5c-2.5-1-4-3.5-4-6 0-4 4-7 8-7s8 3 8 7c0 2.5-1.5 5-4 6" />
          <path d="M12 4.5V3" />
          <path d="M8.5 5.5 7.5 4M15.5 5.5l1-1" />
          <path d="M8 21c1.5 1 6.5 1 8 0" />
          <path d="M7 18.5c-.5.8-.5 2 1 2.5M17 18.5c.5.8.5 2-1 2.5" />
        </svg>
      );

    // ── Душ: лейка + капли ───────────────────────────────────────────────
    case 'shower':
      return (
        <svg {...s}>
          <path d="M4 4a8 8 0 0116 0" />
          <line x1="12" y1="4" x2="12" y2="9" />
          <line x1="8"  y1="14" x2="8"  y2="17" />
          <line x1="12" y1="12" x2="12" y2="15" />
          <line x1="16" y1="14" x2="16" y2="17" />
          <line x1="10" y1="17" x2="10" y2="20" />
          <line x1="14" y1="17" x2="14" y2="20" />
        </svg>
      );

    // ── Сон: луна + звёздочки ─────────────────────────────────────────────
    case 'sleep':
      return (
        <svg {...s}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          <line x1="19" y1="3"  x2="19" y2="5" />
          <line x1="18" y1="4"  x2="20" y2="4" />
          <line x1="22" y1="7"  x2="22" y2="9" />
          <line x1="21" y1="8"  x2="23" y2="8" />
        </svg>
      );

    // ── Школа: рюкзак ────────────────────────────────────────────────────
    case 'school':
      return (
        <svg {...s}>
          <path d="M6 9C6 6.8 7.8 5 10 5h4c2.2 0 4 1.8 4 4v11H6V9z" />
          <path d="M10 5V4a2 2 0 1 1 4 0v1" />
          <path d="M6 14h12" />
          <path d="M10 18h4" />
          <path d="M2 12c0-.6.4-1 1-1h2v5H3c-.6 0-1-.4-1-1z" />
          <path d="M22 12c0-.6-.4-1-1-1h-2v5h2c.6 0 1-.4 1-1z" />
        </svg>
      );

    // ── Домашка: карандаш ────────────────────────────────────────────────
    case 'homework':
      return (
        <svg {...s}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );

    // ── Чтение: открытая книга ───────────────────────────────────────────
    case 'reading':
      return (
        <svg {...s}>
          <path d="M2 4.5A2.5 2.5 0 0 1 4.5 2h.5v18H4.5A2.5 2.5 0 0 1 2 17.5z" />
          <path d="M5 2h9a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5" />
          <line x1="9" y1="7"  x2="15" y2="7" />
          <line x1="9" y1="11" x2="15" y2="11" />
          <line x1="9" y1="15" x2="12" y2="15" />
        </svg>
      );

    // ── Музыка: нота ─────────────────────────────────────────────────────
    case 'music':
      return (
        <svg {...s}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6"  cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );

    // ── Уборка: метла ────────────────────────────────────────────────────
    case 'cleaning':
      return (
        <svg {...s}>
          <path d="M3 21 12 12" />
          <path d="M12 12 20 4" />
          <path d="M18 6l2-2" />
          <path d="M5 19c-1 1-2.5 1-3 0s0-2.5 1-3l7-7 2 2z" />
        </svg>
      );

    // ── Кухня: вилка и нож ───────────────────────────────────────────────
    case 'kitchen':
      return (
        <svg {...s}>
          <path d="M3 2v7c0 1.7 1.3 3 3 3s3-1.3 3-3V2" />
          <line x1="6" y1="5" x2="6" y2="2" />
          <line x1="6" y1="12" x2="6" y2="22" />
          <path d="M21 2c0 5-2 7-2 10v10" />
          <path d="M19 2c0 5 2 7 2 10" />
        </svg>
      );

    // ── Посуда: тарелка + приборы ────────────────────────────────────────
    case 'dishes':
      return (
        <svg {...s}>
          <circle cx="12" cy="13" r="7" />
          <circle cx="12" cy="13" r="3" />
          <path d="M5 13H2M19 13h3" />
          <path d="M12 2v3" />
        </svg>
      );

    // ── Мусор: ведро ─────────────────────────────────────────────────────
    case 'trash':
      return (
        <svg {...s}>
          <path d="M3 6h18" />
          <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
          <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );

    // ── Стирка: футболка ─────────────────────────────────────────────────
    case 'laundry':
      return (
        <svg {...s}>
          <path d="M3 6l4-3 5 3 5-3 4 3-2.5 4H19v11H5V10H5.5z" />
        </svg>
      );

    // ── Готовка: кастрюля ────────────────────────────────────────────────
    case 'cooking':
      return (
        <svg {...s}>
          <path d="M2 12h20v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
          <path d="M2 12h20" />
          <path d="M8 12V8a4 4 0 0 1 8 0v4" />
          <path d="M9 4c0 1.5 1 2 1 4M12 3v5M15 4c0 1.5-1 2-1 4" />
          <path d="M0 12h2M22 12h2" />
        </svg>
      );

    // ── Спорт: кроссовок ─────────────────────────────────────────────────
    case 'sport':
      return (
        <svg {...s}>
          <path d="M2 17h15a5 5 0 0 0 5-5v-1l-6-2-3-5H9L4 13" />
          <path d="M2 17c0 1.7 1.3 3 3 3h14" />
          <path d="M9 4v5M13 6v3" />
        </svg>
      );

    // ── Прогулка: след ботинка ───────────────────────────────────────────
    case 'walk':
      return (
        <svg {...s}>
          <ellipse cx="8"  cy="9"  rx="3" ry="4.5" transform="rotate(-10 8 9)" />
          <ellipse cx="16" cy="15" rx="3" ry="4.5" transform="rotate(10 16 15)" />
          <path d="M6 5.5c.5-1 1.5-1.5 2-1s.5 1.5 0 2" strokeWidth="1.5" />
          <path d="M14 11.5c.5-1 1.5-1.5 2-1s.5 1.5 0 2" strokeWidth="1.5" />
        </svg>
      );

    // ── Улица: солнце ────────────────────────────────────────────────────
    case 'outdoor':
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2"    x2="12" y2="5" />
          <line x1="12" y1="19"   x2="12" y2="22" />
          <line x1="4.22"  y1="4.22"  x2="6.34"  y2="6.34" />
          <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
          <line x1="2"    y1="12"  x2="5"    y2="12" />
          <line x1="19"   y1="12"  x2="22"   y2="12" />
          <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66" />
          <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22" />
        </svg>
      );

    // ── Тишина / медитация: цветок лотоса ────────────────────────────────
    case 'meditation':
      return (
        <svg {...s}>
          <path d="M12 22c-4-2-7-6-7-10 0-2 3-4 7-1 4-3 7-1 7 1 0 4-3 8-7 10z" />
          <path d="M5 14c-2-1-3-3-2-5 2 0 4 1 4 3M19 14c2-1 3-3 2-5-2 0-4 1-4 3" />
          <path d="M12 11v11" strokeOpacity=".3" />
        </svg>
      );

    // ── Растения: листок ─────────────────────────────────────────────────
    case 'plants':
      return (
        <svg {...s}>
          <path d="M12 22V14" />
          <path d="M12 14C12 9 7 5 3 6c0 5 4 9 9 8z" />
          <path d="M12 14c0-5 5-9 9-8-1 5-5 9-9 8z" />
        </svg>
      );

    // ── Питомец: след лапки ──────────────────────────────────────────────
    case 'pet':
      return (
        <svg {...s}>
          <ellipse cx="12" cy="14" rx="4.5" ry="4" />
          <circle cx="7.5"  cy="9"  r="1.5" />
          <circle cx="12"   cy="7"  r="1.5" />
          <circle cx="16.5" cy="9"  r="1.5" />
          <circle cx="9"    cy="13" r="1" />
          <circle cx="15"   cy="13" r="1" />
        </svg>
      );

    // ── Творчество: кисть ────────────────────────────────────────────────
    case 'creativity':
      return (
        <svg {...s}>
          <path d="M12 22C6.5 22 2 17.5 2 12c0-2 3-5 5-4s3 4 0 4c-1 0-2 1-1 2.5C7 16 9 17 12 17s5.5-1.5 7-4" />
          <path d="M20 3C17 6 16 10 19 13l2-3-2-1 3-2z" />
        </svg>
      );

    // ── Экранное время: смартфон ─────────────────────────────────────────
    case 'screen':
      return (
        <svg {...s}>
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 9v1M12 15v1M9 12h1M15 12h-1" />
          <path d="M9 6h6" />
        </svg>
      );

    // ── Спальня: кровать ─────────────────────────────────────────────────
    case 'bedroom':
      return (
        <svg {...s}>
          <path d="M3 7v13M21 7v13" />
          <path d="M3 14h18" />
          <path d="M3 7c0-2.2 1.8-4 4-4h10c2.2 0 4 1.8 4 4" />
          <path d="M7 14V9.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5V14" />
          <path d="M12 14v-4.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5V14" />
        </svg>
      );

    // ── По времени: часы ─────────────────────────────────────────────────
    case 'clock':
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 3.5" />
        </svg>
      );
  }
}

// ─── Компонент ───────────────────────────────────────────────────────────────

interface TaskIconProps {
  name: TaskIconName;
  size?: number;
  iconSize?: number;
  colored?: boolean;
}

/**
 * Иконка задачи в цветном квадрате.
 * size      — размер внешнего контейнера (px)
 * iconSize  — размер SVG внутри (по умолчанию 55% от size)
 * colored   — цветной фон (true по умолчанию)
 */
export function TaskIcon({ name, size = 38, iconSize, colored = true }: TaskIconProps) {
  const colors = ICON_COLORS[name];
  const inner  = iconSize ?? Math.round(size * 0.55);

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
        color:      colored ? colors.fg : 'var(--text-soft)',
        flexShrink: 0,
      }}
    >
      <IconSvg name={name} size={inner} />
    </span>
  );
}
