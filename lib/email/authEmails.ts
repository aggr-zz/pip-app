/**
 * RU-шаблоны писем авторизации (для Send Email Hook GoTrue).
 * Рендерят брендированное письмо PIP по типу действия + ссылке подтверждения.
 */

export interface AuthEmailData {
  token?: string;
  token_hash?: string;
  redirect_to?: string;
  email_action_type?: string;
  site_url?: string;
}

interface Tpl {
  subject: string;
  heading: string;
  intro: string;
  button: string;
  footer: string;
}

const TEMPLATES: Record<string, Tpl> = {
  signup: {
    subject: 'Подтвердите регистрацию в PIP',
    heading: 'Подтвердите регистрацию',
    intro: 'Рады видеть вас в PIP! Подтвердите email — и можно создавать семью, добавлять детей и задания.',
    button: 'Подтвердить email',
    footer: 'Вы получили это письмо, потому что регистрировались в PIP. Если это не вы — просто проигнорируйте письмо.',
  },
  recovery: {
    subject: 'Сброс пароля в PIP',
    heading: 'Сброс пароля',
    intro: 'Вы запросили сброс пароля в PIP. Нажмите кнопку, чтобы задать новый пароль. Ссылка действует ограниченное время.',
    button: 'Задать новый пароль',
    footer: 'Если вы не запрашивали сброс — проигнорируйте это письмо, пароль останется прежним.',
  },
  invite: {
    subject: 'Приглашение в PIP',
    heading: 'Приглашение в PIP',
    intro: 'Вас пригласили в семью в PIP — приложении, где дети выполняют задания и копят PIP-монеты на награды.',
    button: 'Принять приглашение',
    footer: 'Если вы не ожидали приглашения — можно проигнорировать это письмо.',
  },
  magiclink: {
    subject: 'Вход в PIP',
    heading: 'Вход в PIP',
    intro: 'Нажмите кнопку, чтобы войти в PIP без пароля. Ссылка одноразовая и действует ограниченное время.',
    button: 'Войти в PIP',
    footer: 'Если вы не запрашивали вход — проигнорируйте это письмо.',
  },
  email_change: {
    subject: 'Подтвердите новый email в PIP',
    heading: 'Подтвердите новый email',
    intro: 'Вы меняете адрес почты в PIP. Подтвердите новый email, нажав кнопку ниже.',
    button: 'Подтвердить новый email',
    footer: 'Если вы не меняли email — проигнорируйте это письмо и проверьте безопасность аккаунта.',
  },
};

// тип действия GoTrue -> параметр type у /auth/v1/verify
function verifyType(actionType: string): string {
  if (actionType === 'email_change_new' || actionType === 'email_change_current') return 'email_change';
  return actionType;
}

function wrap(t: Tpl, url: string): string {
  return `<!doctype html><html lang="ru"><body style="margin:0;background:#ECEEF6;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ECEEF6;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:20px;overflow:hidden;">
      <tr><td style="padding:32px 32px 8px;"><div style="font-size:26px;font-weight:800;color:#1B2238;letter-spacing:-.02em;">pip</div></td></tr>
      <tr><td style="padding:8px 32px 4px;">
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0F1320;">${t.heading}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#48506b;">${t.intro}</p>
        <a href="${url}" style="display:inline-block;background:#EE6C4D;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px;">${t.button}</a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#8b91a7;">Если кнопка не работает, скопируйте ссылку в браузер:<br><a href="${url}" style="color:#EE6C4D;word-break:break-all;">${url}</a></p>
      </td></tr>
      <tr><td style="padding:24px 32px 32px;border-top:1px solid #eef0f5;"><p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#a0a6b8;">${t.footer}<br>PIP — копилка хороших привычек · pipup.ru</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function renderAuthEmail(
  data: AuthEmailData,
  apiBase: string,
): { subject: string; html: string } {
  const actionType = data.email_action_type || 'signup';
  const tpl = TEMPLATES[actionType] || TEMPLATES[verifyType(actionType)] || TEMPLATES.signup;

  const redirectTo = data.redirect_to || data.site_url || 'https://pipup.ru';
  const url =
    `${apiBase}/auth/v1/verify` +
    `?token=${encodeURIComponent(data.token_hash || '')}` +
    `&type=${encodeURIComponent(verifyType(actionType))}` +
    `&redirect_to=${encodeURIComponent(redirectTo)}`;

  return { subject: tpl.subject, html: wrap(tpl, url) };
}
