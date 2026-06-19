import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Лёгкое чтение childId из payload токена pip_child_direct — БЕЗ проверки
 * подписи (в edge-рантайме middleware нет node:crypto). Используется только
 * для маршрутизации /child/*. Криптографическую проверку HMAC делает
 * getChildContext в серверном компоненте (Node-рантайм) — там же реальная
 * граница безопасности. Подделанный токен пройдёт middleware, но будет
 * отклонён на странице.
 */
function readChildClaim(token: string): string | null {
  try {
    const data = token.slice(0, token.lastIndexOf('.'));
    if (!data) return null;
    const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) return null;
    return typeof payload.childId === 'string' ? payload.childId : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') return NextResponse.next();
  if (pathname.startsWith('/.well-known/')) return NextResponse.next();
  if (pathname.startsWith('/join/')) return NextResponse.next();
  if (pathname.startsWith('/invite-family/')) return NextResponse.next();
  if (pathname === '/auth/confirm') return NextResponse.next();
  if (pathname === '/forgot-password' || pathname === '/reset-password') return NextResponse.next();
  if (pathname === '/terms' || pathname === '/privacy') return NextResponse.next();

  // /child/* — пропускаем, если childId в токене совпадает с URL.
  // Подпись проверит getChildContext на странице.
  if (pathname.startsWith('/child/')) {
    const token = request.cookies.get('pip_child_direct')?.value;
    const childId = token ? readChildClaim(token) : null;
    if (childId && pathname.split('/')[2] === childId) {
      return NextResponse.next();
    }
  }

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
