import { createClient } from '@supabase/supabase-js';

/**
 * Supabase-клиент с service_role ключом.
 * Обходит RLS — использовать ТОЛЬКО server-side.
 * Нужен для детского входа через /join, где нет родительской сессии.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
