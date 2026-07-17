'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { friendlyDbError } from '@/lib/friendlyError';
import type { Result } from '@/lib/result';


/**
 * Записать факт выдачи реальных денег в обмен на pip.
 *
 * Логика — в SQL-функции record_cash_payout:
 *   - блокирует профиль ребёнка
 *   - проверяет что текущий пользователь — родитель той же семьи
 *   - проверяет что хватает баланса
 *   - создаёт транзакцию type='cash_payout' с pip и cash_amount
 *   - триггер обновляет profiles.balance
 *
 * Это иммутабельная запись. Если родитель ошибся — можно зафиксировать
 * обратную операцию через manual_adjustment (Sprint 7) или просто
 * не повторять выдачу.
 */
export async function recordCashPayout(input: {
  profileId: string;
  pipAmount: number;
  cashAmount: number;
  currency?: string;
  reason?: string;
}): Promise<Result<{ transactionId: string; newBalance: number }>> {
  // Валидация на клиенте уже была, но дублируем для безопасности.
  if (!Number.isInteger(input.pipAmount) || input.pipAmount <= 0) {
    return { ok: false, error: 'Списываемые pip должны быть положительным целым числом' };
  }
  if (!Number.isFinite(input.cashAmount) || input.cashAmount <= 0) {
    return { ok: false, error: 'Сумма к выдаче должна быть положительной' };
  }
  if (input.cashAmount > 1_000_000) {
    return { ok: false, error: 'Сумма слишком большая — проверь, не ошибся ли в нулях' };
  }
  if (input.reason && input.reason.length > 200) {
    return { ok: false, error: 'Комментарий слишком длинный (макс 200)' };
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data, error } = await supabase.rpc('record_cash_payout', {
    p_profile_id: input.profileId,
    p_pip_amount: input.pipAmount,
    p_cash_amount: input.cashAmount,
    p_currency: input.currency || 'RUB',
    p_reason: input.reason?.trim() || null,
  });

  if (error) {
    console.error('[recordCashPayout]', error);
    return { ok: false, error: friendlyDbError(error.message, 'Не получилось записать выдачу') };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'Пустой ответ от БД' };

  revalidatePath(`/parent/children/${input.profileId}`);
  revalidatePath(`/parent/children/${input.profileId}/cash`);
  revalidatePath('/parent');
  revalidatePath('/parent/stats');

  return {
    ok: true,
    transactionId: row.transaction_id,
    newBalance: row.new_balance,
  };
}
