import { redirect } from 'next/navigation';

// В MVP детей идентифицируем по profile.id, режим всегда /child/[id].
// Сюда можно попасть только по старой ссылке — отправляем на дашборд родителя.
export default function ChildIndexPage() {
  redirect('/parent');
}
