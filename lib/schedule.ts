// ─── Расписание задач ────────────────────────────────────────────────
//
// schedule_type:
//   - 'daily'    — каждый день
//   - 'weekdays' — пн–пт
//   - 'custom'   — массив schedule_days (0=пн, 6=вс)
//   - 'once'     — каждый день пока не выполнено (потом архивируется вручную)

export type ScheduleType = 'daily' | 'weekdays' | 'custom' | 'once';

export interface ScheduledTask {
  schedule_type: ScheduleType;
  schedule_days: number[] | null;
}

/**
 * День недели в формате 0=пн … 6=вс
 */
export function dayOfWeek(date: Date): number {
  // JS: 0=вс, 1=пн … 6=сб. Сдвигаем чтобы 0=пн.
  const jsDay = date.getDay();
  return (jsDay + 6) % 7;
}

/**
 * Задача доступна сегодня?
 */
export function isTaskScheduledFor(task: ScheduledTask, date: Date): boolean {
  const dow = dayOfWeek(date);

  switch (task.schedule_type) {
    case 'daily':
      return true;
    case 'weekdays':
      return dow >= 0 && dow <= 4;
    case 'custom':
      return Array.isArray(task.schedule_days) && task.schedule_days.includes(dow);
    case 'once':
      return true; // показывается каждый день, пока не выполнено
    default:
      return false;
  }
}

/**
 * Сегодняшняя дата в часовом поясе семьи в формате YYYY-MM-DD.
 * Используется как `scheduled_for` в task_completions.
 */
export function todayInTimezone(timezone: string): string {
  const now = new Date();
  // Intl.DateTimeFormat с указанной таймзоной даёт нужные части
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now); // 'YYYY-MM-DD'
}

/**
 * Дата как объект Date в часовом поясе. Для проверки schedule.
 */
export function nowInTimezone(timezone: string): Date {
  const isoDate = todayInTimezone(timezone);
  // Парсим в local, но день/неделя корректны
  return new Date(isoDate + 'T12:00:00');
}

/**
 * Человечное описание расписания: "Каждый день", "Пн–Пт", "Пн, Ср, Пт"
 */
export function describeSchedule(task: ScheduledTask): string {
  const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  switch (task.schedule_type) {
    case 'daily':
      return 'Каждый день';
    case 'weekdays':
      return 'Пн–Пт';
    case 'custom':
      if (!task.schedule_days || task.schedule_days.length === 0) return 'Не задано';
      return task.schedule_days
        .slice()
        .sort((a, b) => a - b)
        .map((d) => dayLabels[d])
        .join(', ');
    case 'once':
      return 'Разово';
    default:
      return '';
  }
}
