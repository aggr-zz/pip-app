'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase-клиент для использования в client-компонентах.
 * Сессия хранится в куки, синхронизируется с серверной стороной.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
