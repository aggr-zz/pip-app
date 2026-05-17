/**
 * Каталог достижений pip.
 *
 * Каждый тип имеет иконку (emoji), название, описание для UI.
 * Order здесь = порядок в сетке /child/[id]/achievements.
 *
 * Чтобы добавить новое достижение:
 *  1. Добавь в этот объект
 *  2. Добавь блок проверки в SQL функции check_achievements
 *  3. (опционально) добавь в backfill миграции 011 для существующих
 */

export type AchievementType =
  | 'first_task'
  | 'tasks_10'
  | 'tasks_50'
  | 'tasks_100'
  | 'coins_100'
  | 'coins_500'
  | 'coins_1000'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'first_reward';

interface AchievementMeta {
  icon: string;
  title: string;
  description: string;
  category: 'tasks' | 'coins' | 'streak' | 'rewards';
  /** Приблизительный порядок «когда обычно получают» — для сортировки в UI */
  difficulty: number;
}

export const ACHIEVEMENTS: Record<AchievementType, AchievementMeta> = {
  // Tasks
  first_task: {
    icon: '🎯',
    title: 'Первый шаг',
    description: 'Выполни самую первую задачу',
    category: 'tasks',
    difficulty: 1,
  },
  tasks_10: {
    icon: '⭐',
    title: '10 задач',
    description: 'Выполни десять задач',
    category: 'tasks',
    difficulty: 3,
  },
  tasks_50: {
    icon: '🌟',
    title: '50 задач',
    description: 'Выполни пятьдесят задач',
    category: 'tasks',
    difficulty: 5,
  },
  tasks_100: {
    icon: '💫',
    title: '100 задач',
    description: 'Сто задач — это сила',
    category: 'tasks',
    difficulty: 7,
  },

  // Coins
  coins_100: {
    icon: '🪙',
    title: 'Сто монеток',
    description: 'Накопи 100 pip за всё время',
    category: 'coins',
    difficulty: 2,
  },
  coins_500: {
    icon: '💰',
    title: 'Полтыщи',
    description: 'Накопи 500 pip за всё время',
    category: 'coins',
    difficulty: 4,
  },
  coins_1000: {
    icon: '💎',
    title: 'Тыща!',
    description: 'Накопи 1000 pip — серьёзная сумма',
    category: 'coins',
    difficulty: 6,
  },

  // Streaks
  streak_3: {
    icon: '🔥',
    title: 'Три подряд',
    description: 'Делай задачи три дня подряд',
    category: 'streak',
    difficulty: 2,
  },
  streak_7: {
    icon: '⚡',
    title: 'Неделя в ритме',
    description: 'Семь дней подряд без пропусков',
    category: 'streak',
    difficulty: 5,
  },
  streak_30: {
    icon: '🚀',
    title: 'Месяц-чемпион',
    description: 'Тридцать дней подряд',
    category: 'streak',
    difficulty: 9,
  },

  // Rewards
  first_reward: {
    icon: '🎁',
    title: 'Первый приз',
    description: 'Получи первую награду из магазина',
    category: 'rewards',
    difficulty: 3,
  },
};

/** Список всех типов в порядке отображения (по сложности) */
export const ALL_ACHIEVEMENT_TYPES: AchievementType[] = (
  Object.keys(ACHIEVEMENTS) as AchievementType[]
).sort((a, b) => ACHIEVEMENTS[a].difficulty - ACHIEVEMENTS[b].difficulty);

/** Заголовки категорий для группировки */
export const CATEGORY_LABELS: Record<AchievementMeta['category'], string> = {
  tasks: 'Задачи',
  coins: 'Монеты',
  streak: 'Стрики',
  rewards: 'Награды',
};
