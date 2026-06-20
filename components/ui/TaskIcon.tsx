// ─── Иконки категорий задач ──────────────────────────────────────────────────
// 24 категории. Стиль: объёмные эмодзи на цветном фоне.
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

// ─── Эмодзи ───────────────────────────────────────────────────────────────────

export const ICON_EMOJI: Record<TaskIconName, string> = {
  teeth:      '🦷',
  hygiene:    '🧼',
  shower:     '🚿',
  sleep:      '😴',
  school:     '🎒',
  homework:   '📝',
  reading:    '📖',
  music:      '🎵',
  cleaning:   '🧹',
  kitchen:    '🍴',
  dishes:     '🍽️',
  trash:      '🗑️',
  laundry:    '👕',
  cooking:    '🍳',
  sport:      '👟',
  walk:       '🚶',
  outdoor:    '☀️',
  meditation: '🧘',
  plants:     '🌿',
  pet:        '🐾',
  creativity: '🎨',
  screen:     '📱',
  bedroom:    '🛏️',
  clock:      '⏰',
};

// ─── Цвета фона ───────────────────────────────────────────────────────────────

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

// ─── Компонент ────────────────────────────────────────────────────────────────

interface TaskIconProps {
  name: string;
  size?: number;
  colored?: boolean;
}

/**
 * Иконка задачи — объёмный эмодзи на цветном фоне.
 * size    — размер контейнера (px), по умолчанию 38
 * colored — цветной фон (true по умолчанию)
 *
 * name — ключ из TASK_ICONS. Если значение неизвестно (легаси/эмодзи прямо
 * в БД), показываем его как есть на нейтральном фоне — лучше, чем пустота.
 */
export function TaskIcon({ name, size = 38, colored = true }: TaskIconProps) {
  const colors  = ICON_COLORS[name as TaskIconName] ?? { bg: '#EAEDF3', fg: '#4A5066' };
  const emoji   = ICON_EMOJI[name as TaskIconName] ?? name;
  const fontSize = Math.round(size * 0.52);

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
        flexShrink: 0,
        fontSize,
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {emoji}
    </span>
  );
}
