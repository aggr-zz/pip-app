import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (e) {
    // Fallback: пропускаем запрос если middleware упал
    console.error('[middleware] error:', e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Применять middleware ко всем путям, кроме:
     * - _next/static (статика Next.js)
     * - _next/image (оптимизация картинок)
     * - favicon.ico
     * - картинки в public (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
