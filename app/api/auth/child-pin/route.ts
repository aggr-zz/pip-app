import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { signChildSession } from '@/lib/childSession';

/**
 * POST /api/auth/child-pin
 * Body: { childId, pin }
 *
 * Верифицирует PIN ребёнка, устанавливает куку pip_child_direct
 * и редиректит на /child/[childId] — всё в одном HTTP-ответе.
 * Это гарантирует что кука доступна при следующем запросе (в отличие от server action).
 */
export async function POST(req: NextRequest) {
  try {
    const { childId, pin } = await req.json();

    if (!childId || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN — 4 цифры' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: child, error } = await supabase
      .from('profiles')
      .select('id, family_id, pin, role, name, archived_at')
      .eq('id', childId)
      .single();

    if (error || !child)      return NextResponse.json({ error: 'Профиль не найден' }, { status: 404 });
    if (child.role !== 'child') return NextResponse.json({ error: 'Это не детский профиль' }, { status: 403 });
    if (child.archived_at)    return NextResponse.json({ error: 'Профиль удалён' }, { status: 403 });
    if (child.pin !== pin)    return NextResponse.json({ error: 'Неверный PIN' }, { status: 401 });

    const token = signChildSession(child.id, child.family_id);

    // Возвращаем 200 + Set-Cookie (без редиректа).
    // Клиент сам навигирует через window.location.href — это гарантирует
    // что кука записана в jar ДО следующего запроса.
    // (fetch + redirect:'follow' на Android Chrome иногда не сохраняет
    //  Set-Cookie из промежуточного 302-ответа до завершения fetch.)
    const response = NextResponse.json({ ok: true, childId: child.id });

    response.cookies.set('pip_child_direct', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   30 * 24 * 60 * 60, // 30 дней
      path:     '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
