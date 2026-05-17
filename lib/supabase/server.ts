import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase-клиент для server-компонентов и server actions.
 * Читает/пишет cookies для синхронизации сессии с браузером.
 *
 * Использование:
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // В server-компонентах нельзя писать cookies — это нормально, их установит middleware.
          }
        },
      },
    }
  );
}
