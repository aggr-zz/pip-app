import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { verifyChildSession } from '@/lib/childSession';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // / — лендинг, публичная страница (сам проверяет авторизацию)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // /.well-known/* — системные файлы (assetlinks.json и др.), без авторизации
  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next();
  }

  // /join/* — публичные страницы, не требуют никакой авторизации
  if (pathname.startsWith('/join/')) {
    return NextResponse.next();
  }

  // /invite-family/* — публичная страница принятия инвайта
  if (pathname.startsWith('/invite-family/')) {
    return NextResponse.next();
  }

  // Страницы сброса пароля — публичные (сессия создаётся через code из письма)
  if (pathname === '/forgot-password' || pathname === '/reset-password') {
    return NextResponse.next();
  }

  // Юридические страницы — публичные
  if (pathname === '/terms' || pathname === '/privacy') {
    return NextResponse.next();
  }

  // /child/* — разрешаем если есть валидный pip_child_direct токен
  if (pathname.startsWith('/child/')) {
    const token = request.cookies.get('pip_child_direct')?.value;
    if (token) {
      const session = verifyChildSession(token);
      if (session) {
        // Дополнительная проверка: childId в URL должен совпадать с токеном
        const segments = pathname.split('/'); // ['', 'child', '<id>', ...]
        const childIdInUrl = segments[2];
        if (childIdInUrl === session.childId) {
          return NextResponse.next();
        }
      }
    }
  }

  // Для всех остальных маршрутов — стандартная Supabase-авторизация
  try {
    return await updateSession(request);
  } catch (e) {
    console.error('[middleware] error:', e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/assetlinks|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
