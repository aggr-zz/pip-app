'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Result<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/**
 * Родитель отметил, что выдал награду в реальной жизни.
 * Заказ переходит pending → fulfilled. Монеты уже списаны при заказе.
 */
export async function fulfillOrder(orderId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { error } = await supabase.rpc('fulfill_reward_order', {
    p_order_id: orderId,
  });

  if (error) {
    console.error('[fulfillOrder]', error);
    return { ok: false, error: error.message || 'Не получилось выдать' };
  }

  // Проверяем достижения ребёнка (нужен profile_id из заказа)
  const { data: order } = await supabase
    .from('reward_orders')
    .select('profile_id')
    .eq('id', orderId)
    .single();

  if (order?.profile_id) {
    try {
      await supabase.rpc('check_achievements', { p_profile_id: order.profile_id });
    } catch (e) {
      console.warn('[fulfillOrder] check_achievements failed:', e);
    }
    revalidatePath(`/child/${order.profile_id}/achievements`);
  }

  revalidatePath('/parent/orders');
  revalidatePath('/parent');
  return { ok: true };
}

/**
 * Родитель отменяет pending заказ. Монеты возвращаются ребёнку
 * через refund-транзакцию (атомарно в SQL-функции).
 */
export async function cancelOrder(input: {
  orderId: string;
  reason: string;
}): Promise<Result<{ refunded: number; balance: number }>> {
  const reason = (input.reason ?? '').trim();
  if (!reason) {
    return { ok: false, error: 'Напиши, почему отменяешь — увидит ребёнок' };
  }
  if (reason.length > 500) {
    return { ok: false, error: 'Слишком длинный комментарий (макс 500)' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data, error } = await supabase.rpc('cancel_reward_order', {
    p_order_id: input.orderId,
    p_reason: reason,
  });

  if (error) {
    console.error('[cancelOrder]', error);
    return { ok: false, error: error.message || 'Не получилось отменить' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'Пустой ответ от БД' };

  revalidatePath('/parent/orders');
  revalidatePath('/parent');

  return {
    ok: true,
    refunded: row.refunded ?? 0,
    balance: row.new_balance ?? 0,
  };
}
