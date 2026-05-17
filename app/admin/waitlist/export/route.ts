import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { data: isAdmin } = await supabase.rpc('is_current_user_admin');
  if (!isAdmin) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Получаем все waitlist-записи
  const { data: rows, error } = await supabase
    .from('waitlist')
    .select('email, name, source, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return new NextResponse('Failed to load waitlist', { status: 500 });
  }

  // Формируем CSV. Учитываем экранирование: запятые, кавычки, переводы строк.
  const header = 'email,name,source,created_at\n';
  const body = (rows ?? [])
    .map((r) =>
      [r.email, r.name ?? '', r.source ?? '', r.created_at]
        .map(csvEscape)
        .join(','),
    )
    .join('\n');

  const csv = header + body + '\n';

  // BOM чтобы Excel правильно понял UTF-8
  const bom = '\uFEFF';

  const now = new Date().toISOString().slice(0, 10);

  return new NextResponse(bom + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pip-waitlist-${now}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Если есть запятая, кавычка или перевод строки — экранируем в двойные кавычки,
  // удваивая внутренние кавычки.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
