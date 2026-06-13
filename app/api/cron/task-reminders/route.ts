import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToProfile } from '@/lib/webpush';
import { isTaskScheduledFor, nowInTimezone, todayInTimezone, type ScheduleType } from '@/lib/schedule';

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

  // Строка времени для сравнения — окно ±15 минут.
  // remind_at хранится как TIME в МСК — сравниваем диапазон.
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
  // Окно может переходить через полночь (напр. 23:50–00:20) — тогда fromTime > toTime
  // и обычный gte+lte даёт пустой диапазон. В этом случае берём remind_at >= from ИЛИ <= to.
  const wrapsMidnight = fromTime > toTime;

  // ── Находим задачи с remind_at в текущем окне ─────────────────────────────
  let tasksQuery = admin
    .from('tasks')
    .select('id, title, icon, schedule_type, schedule_days, assigned_to, family_id')
    .not('remind_at', 'is', null)
    .is('archived_at', null);

  tasksQuery = wrapsMidnight
    ? tasksQuery.or(`remind_at.gte.${fromTime},remind_at.lte.${toTime}`)
    : tasksQuery.gte('remind_at', fromTime).lte('remind_at', toTime);

  const { data: tasks, error: tasksError } = await tasksQuery
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

  // ── Таймзоны семей: день недели и "сегодня" считаем в часовом поясе семьи,
  //    как в markTaskComplete — иначе на границе суток дедуп ломается ────────
  const familyIds = [...new Set(tasks.map((t) => t.family_id))];
  const { data: families } = await admin
    .from('families')
    .select('id, timezone')
    .in('id', familyIds)
    .returns<Array<{ id: string; timezone: string | null }>>();
  const tzByFamily = new Map<string, string>(
    (families ?? []).map((f) => [f.id, f.timezone || 'Europe/Moscow'])
  );

  let totalSent = 0;
  let tasksChecked = 0;

  for (const task of tasks) {
    const tz = tzByFamily.get(task.family_id) || 'Europe/Moscow';

    // Подходит ли сегодняшний день недели в часовом поясе семьи?
    if (!isTaskScheduledFor(
      { schedule_type: task.schedule_type as ScheduleType, schedule_days: task.schedule_days },
      nowInTimezone(tz),
    )) continue;
    tasksChecked++;

    // Дата "сегодня" в часовом поясе семьи (совпадает со scheduled_for в task_completions)
    const today = todayInTimezone(tz);
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
        .eq('scheduled_for', today)
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
    tasksChecked,
    time: `${fromTime}–${toTime} MSK`,
  });
}

// Vercel Cron также может вызывать через GET
export async function GET(request: NextRequest) {
  return POST(request);
}
