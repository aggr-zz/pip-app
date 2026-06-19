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

  // ── Все дети нужных семей — ОДНИМ запросом (раньше был запрос на каждую задачу) ──
  const { data: allChildren } = await admin
    .from('profiles')
    .select('id, name, family_id')
    .in('family_id', familyIds)
    .eq('role', 'child')
    .is('archived_at', null)
    .returns<Array<{ id: string; name: string; family_id: string }>>();

  const childrenByFamily = new Map<string, Array<{ id: string; name: string }>>();
  for (const c of allChildren ?? []) {
    const arr = childrenByFamily.get(c.family_id) ?? [];
    arr.push({ id: c.id, name: c.name });
    childrenByFamily.set(c.family_id, arr);
  }

  // ── Собираем кандидатов на напоминание (задача актуальна сегодня × целевые дети) ──
  type Reminder = { taskId: string; title: string; childId: string; today: string };
  const reminders: Reminder[] = [];
  const taskIds = new Set<string>();
  const childIds = new Set<string>();
  const todays = new Set<string>();

  for (const task of tasks) {
    const tz = tzByFamily.get(task.family_id) || 'Europe/Moscow';
    if (!isTaskScheduledFor(
      { schedule_type: task.schedule_type as ScheduleType, schedule_days: task.schedule_days },
      nowInTimezone(tz),
    )) continue;
    tasksChecked++;

    const today = todayInTimezone(tz);
    const familyChildren = childrenByFamily.get(task.family_id) ?? [];
    const targetChildren = task.assigned_to && task.assigned_to.length > 0
      ? familyChildren.filter((c) => task.assigned_to!.includes(c.id))
      : familyChildren;

    for (const child of targetChildren) {
      reminders.push({ taskId: task.id, title: task.title, childId: child.id, today });
      taskIds.add(task.id);
      childIds.add(child.id);
      todays.add(today);
    }
  }

  // ── Уже выполненные сегодня — ОДНИМ запросом; ключ task:child:date ──
  const doneSet = new Set<string>();
  if (reminders.length > 0) {
    const { data: comps } = await admin
      .from('task_completions')
      .select('task_id, profile_id, scheduled_for')
      .in('task_id', [...taskIds])
      .in('profile_id', [...childIds])
      .in('scheduled_for', [...todays])
      .in('status', ['pending', 'approved', 'auto_approved'])
      .returns<Array<{ task_id: string; profile_id: string; scheduled_for: string }>>();
    for (const c of comps ?? []) {
      doneSet.add(`${c.task_id}:${c.profile_id}:${c.scheduled_for}`);
    }
  }

  // ── Шлём пуши тем, кто ещё не выполнил ──
  for (const r of reminders) {
    if (doneSet.has(`${r.taskId}:${r.childId}:${r.today}`)) continue;
    try {
      await sendPushToProfile(r.childId, {
        title: '⏰ Напоминание',
        body: `Не забудь: ${r.title}`,
        url: `/child/${r.childId}`,
      });
      totalSent++;
    } catch (e) {
      console.warn(`[task-reminders] push failed for child ${r.childId}:`, e);
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
