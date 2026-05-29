import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToProfile } from '@/lib/webpush';

/**
 * POST /api/cron/task-reminders
 *
 * Вызывается каждые 30 минут через Supabase pg_cron + pg_net.
 * Ищет задания с remind_at ≈ текущее московское время,
 * отправляет push-напоминание детям, не выполнившим задачу сегодня.
 *
 * Защита: заголовок x-cron-secret должен совпадать с env CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  // ── Авторизация ────────────────────────────────────────────────────────────
  const secret = request.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // ── Текущее время в Москве (UTC+3) ─────────────────────────────────────────
  const now = new Date();
  const moscowOffset = 3 * 60; // минуты
  const moscowMs = now.getTime() + (moscowOffset - now.getTimezoneOffset()) * 60_000;
  const moscowNow = new Date(moscowMs);

  const currentHour = moscowNow.getHours();
  const currentMinute = moscowNow.getMinutes();

  // День недели в московском времени (0=Вс, 1=Пн..6=Сб)
  // Конвертируем в наш формат (0=Пн..6=Вс)
  const jsDow = moscowNow.getDay(); // 0=Sun
  const appDow = jsDow === 0 ? 6 : jsDow - 1; // 0=Mon..6=Sun

  // Строка времени для сравнения — окно ±15 минут
  // remind_at хранится как TIME — сравниваем диапазон
  const windowMinutes = 15;
  const totalMin = currentHour * 60 + currentMinute;
  const fromMin = totalMin - windowMinutes;
  const toMin = totalMin + windowMinutes;

  // Форматируем в HH:MM для SQL
  function minToTime(m: number): string {
    const h = Math.floor(((m % 1440) + 1440) % 1440 / 60);
    const min = ((m % 1440) + 1440) % 1440 % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  const fromTime = minToTime(fromMin);
  const toTime = minToTime(toMin);

  // ── Находим задачи с remind_at в текущем окне ─────────────────────────────
  const { data: tasks, error: tasksError } = await admin
    .from('tasks')
    .select('id, title, icon, schedule_type, schedule_days, assigned_to, family_id')
    .not('remind_at', 'is', null)
    .is('archived_at', null)
    .gte('remind_at', fromTime)
    .lte('remind_at', toTime)
    .returns<Array<{
      id: string;
      title: string;
      icon: string;
      schedule_type: string;
      schedule_days: number[] | null;
      assigned_to: string[] | null;
      family_id: string;
    }>>();

  if (tasksError) {
    console.error('[task-reminders] fetch tasks error', tasksError);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No tasks due now' });
  }

  // ── Фильтруем по расписанию (подходит ли сегодняшний день) ───────────────
  const dueTasks = tasks.filter((t) => {
    if (t.schedule_type === 'daily') return true;
    if (t.schedule_type === 'weekdays') return appDow < 5; // 0=Пн..4=Пт
    if (t.schedule_type === 'custom' && t.schedule_days) {
      return t.schedule_days.includes(appDow);
    }
    if (t.schedule_type === 'once') return true; // разовая — тоже напомним
    return false;
  });

  if (dueTasks.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No tasks scheduled for today' });
  }

  // ── Дата "сегодня" в Москве ───────────────────────────────────────────────
  const todayStr = moscowNow.toISOString().split('T')[0]; // YYYY-MM-DD

  let totalSent = 0;

  for (const task of dueTasks) {
    // Находим детей для этого задания
    const { data: children } = await admin
      .from('profiles')
      .select('id, name')
      .eq('family_id', task.family_id)
      .eq('role', 'child')
      .is('archived_at', null)
      .returns<Array<{ id: string; name: string }>>();

    if (!children || children.length === 0) continue;

    // Если assigned_to задан — берём только этих детей
    const targetChildren = task.assigned_to && task.assigned_to.length > 0
      ? children.filter((c) => task.assigned_to!.includes(c.id))
      : children;

    for (const child of targetChildren) {
      // Проверяем — выполнил ли ребёнок это задание сегодня?
      const { count } = await admin
        .from('task_completions')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', task.id)
        .eq('profile_id', child.id)
        .eq('scheduled_for', todayStr)
        .in('status', ['pending', 'approved', 'auto_approved']);

      if ((count ?? 0) > 0) {
        // Задача уже выполнена — не напоминаем
        continue;
      }

      // Отправляем push
      try {
        await sendPushToProfile(child.id, {
          title: '⏰ Напоминание',
          body: `Не забудь: ${task.title}`,
          url: `/child/${child.id}`,
        });
        totalSent++;
      } catch (e) {
        console.warn(`[task-reminders] push failed for child ${child.id}:`, e);
      }
    }
  }

  console.log(`[task-reminders] sent ${totalSent} reminders at ${fromTime}–${toTime} MSK`);
  return NextResponse.json({
    sent: totalSent,
    tasksChecked: dueTasks.length,
    time: `${fromTime}–${toTime} MSK`,
  });
}

// Vercel Cron также может вызывать через GET
export async function GET(request: NextRequest) {
  return POST(request);
}
