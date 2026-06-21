import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Обновляет сессию Supabase в middleware.
 *
 * Это нужно для корректной работы авторизации в Next.js App Router:
 * сессионная cookie токен периодически обновляется, и без этого
 * helper'а пользователь будет «вылетать» из сессии при каждом запросе.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ВАЖНО: не вставляй код между createServerClient и getUser/getSession.
  // Это вызывает рассинхрон cookies и приведёт к багам.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Защита роутов: если не залогинен и пытается зайти на /parent или /child — редирект на /login
  const protectedPaths = ['/parent', '/child'];
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    // Ребёнок на /child/[id] без валидной прямой сессии: ведём на его вход
    // по PIN/QR (/join/[childId]), а не на родительский /login (тупик).
    const childMatch = request.nextUrl.pathname.match(/^\/child\/([^/]+)/);
    if (childMatch) {
      url.pathname = `/join/${childMatch[1]}`;
      url.search = '';
      return NextResponse.redirect(url);
    }
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Если залогинен и идёт на /login или /signup — отправляем на /parent.
  // Но если в ссылке есть ?invite=TOKEN (письмо-приглашение второго родителя,
  // открытое уже залогиненным) — ведём на публичную /invite-family/[token],
  // где инвайт корректно примется, иначе токен молча терялся бы.
  if (user && ['/login', '/signup'].includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    const invite = request.nextUrl.searchParams.get('invite');
    url.pathname = invite ? `/invite-family/${invite}` : '/parent';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
