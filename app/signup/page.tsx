import { redirect } from 'next/navigation';

/**
 * Регистрация теперь живёт на едином экране входа (/login, сегмент «Родитель» →
 * «Зарегистрироваться»). Этот маршрут оставлен редиректом для старых ссылок.
 */
export default async function SignupRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  qs.set('mode', 'register');
  const invite = sp.invite;
  if (typeof invite === 'string') qs.set('invite', invite);
  redirect(`/login?${qs.toString()}`);
}
