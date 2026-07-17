'use server';

import { revalidatePath } from 'next/cache';
import { getParentContext } from '@/lib/getParentContext';
import type { ScheduleType } from '@/lib/schedule';
import type { TaskIconName } from '@/components/ui/TaskIcon';
import type { Result } from '@/lib/result';


export interface TaskInput {
  title: string;
  description?: string | null;
  icon: TaskIconName;
  coin_value: number;
  schedule_type: ScheduleType;
  schedule_days?: number[] | null;
  requires_approval: boolean;
  requires_photo: boolean;
  assigned_to: string[];
  remind_at?: string | null; // 'HH:MM' or null
}

// ─── Валидация ────────────────────────────────────────────────────────
function validateTask(input: TaskInput): string | null {
  const title = (input.title ?? '').trim();
  if (!title) return 'Введи название';
  if (title.length > 80) return 'Название слишком длинное (макс 80)';
  if (input.description && input.description.length > 200) {
    return 'Описание слишком длинное (макс 200)';
  }
  if (!Number.isInteger(input.coin_value) || input.coin_value < 1 || input.coin_value > 500) {
    return 'Цена должна быть от 1 до 500 pip';
  }
  if (!['daily', 'weekdays', 'custom', 'once'].includes(input.schedule_type)) {
    return 'Неверный тип расписания';
  }
  if (input.schedule_type === 'custom') {
    if (!Array.isArray(input.schedule_days) || input.schedule_days.length === 0) {
      return 'Выбери хотя бы один день';
    }
    if (input.schedule_days.some((d) => d < 0 || d > 6)) {
      return 'Неверные дни недели';
    }
  }
  if (!Array.isArray(input.assigned_to) || input.assigned_to.length === 0) {
    return 'Назначь задачу хотя бы одному ребёнку';
  }
  return null;
}

// ─── CREATE ───────────────────────────────────────────────────────────
export async function createTask(input: TaskInput): Promise<Result<{ id: string }>> {
  const validationError = validateTask(input);
  if (validationError) return { ok: false, error: validationError };

  const auth = await getParentContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, familyId, profileId } = auth.ctx;

  // Проверяем что все assigned_to — дети из этой семьи
  const { data: children } = await supabase
    .from('profiles')
    .select('id')
    .eq('family_id', familyId)
    .eq('role', 'child')
    .in('id', input.assigned_to);

  if (!children || children.length !== input.assigned_to.length) {
    return { ok: false, error: 'Не все указанные дети найдены в семье' };
  }

  const { data: newTask, error } = await supabase
    .from('tasks')
    .insert({
      family_id: familyId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      icon: input.icon,
      coin_value: input.coin_value,
      schedule_type: input.schedule_type,
      schedule_days: input.schedule_type === 'custom' ? input.schedule_days : null,
      requires_approval: input.requires_approval,
      requires_photo: input.requires_photo,
      assigned_to: input.assigned_to,
      created_by: profileId,
      remind_at: input.remind_at || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[createTask]', error);
    return { ok: false, error: 'Не получилось создать задачу' };
  }

  revalidatePath('/parent/tasks');
  revalidatePath('/parent');
  return { ok: true, id: newTask.id };
}

// ─── UPDATE ───────────────────────────────────────────────────────────
export async function updateTask(taskId: string, input: TaskInput): Promise<Result> {
  const validationError = validateTask(input);
  if (validationError) return { ok: false, error: validationError };

  const auth = await getParentContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, familyId } = auth.ctx;

  // Проверяем что все assigned_to — дети этой семьи (как в createTask), иначе
  // в задачу можно записать чужой/мусорный uuid.
  const { data: children } = await supabase
    .from('profiles')
    .select('id')
    .eq('family_id', familyId)
    .eq('role', 'child')
    .in('id', input.assigned_to);

  if (!children || children.length !== input.assigned_to.length) {
    return { ok: false, error: 'Не все указанные дети найдены в семье' };
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      icon: input.icon,
      coin_value: input.coin_value,
      schedule_type: input.schedule_type,
      schedule_days: input.schedule_type === 'custom' ? input.schedule_days : null,
      requires_approval: input.requires_approval,
      requires_photo: input.requires_photo,
      assigned_to: input.assigned_to,
      remind_at: input.remind_at || null,
    })
    .eq('id', taskId)
    .eq('family_id', familyId);

  if (error) {
    console.error('[updateTask]', error);
    return { ok: false, error: 'Не получилось обновить' };
  }

  revalidatePath('/parent/tasks');
  revalidatePath(`/parent/tasks/${taskId}`);
  revalidatePath('/parent');
  return { ok: true };
}

// ─── ARCHIVE / UNARCHIVE ──────────────────────────────────────────────
export async function archiveTask(taskId: string): Promise<Result> {
  const auth = await getParentContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, familyId } = auth.ctx;

  const { error } = await supabase
    .from('tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('family_id', familyId);

  if (error) {
    console.error('[archiveTask]', error);
    return { ok: false, error: 'Не получилось архивировать' };
  }

  revalidatePath('/parent/tasks');
  revalidatePath('/parent');
  return { ok: true };
}

export async function unarchiveTask(taskId: string): Promise<Result> {
  const auth = await getParentContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, familyId } = auth.ctx;

  const { error } = await supabase
    .from('tasks')
    .update({ archived_at: null })
    .eq('id', taskId)
    .eq('family_id', familyId);

  if (error) {
    console.error('[unarchiveTask]', error);
    return { ok: false, error: 'Не получилось восстановить' };
  }

  revalidatePath('/parent/tasks');
  return { ok: true };
}
