import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { getInviteInfo } from './inviteActions';
import { AcceptInviteButton } from './AcceptInviteButton';

export default async function InviteFamilyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const info = await getInviteInfo(token);

  // Проверяем — залогинен ли юзер уже
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  // ── Инвалидный / использованный / просроченный инвайт ──────────────────────
  if (!info.valid) {
    const message = info.used
      ? 'Эта ссылка уже была использована'
      : info.expired
      ? 'Срок действия ссылки истёк'
      : 'Ссылка недействительна';

    return (
      <main style={mainStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <PipLogo size={36} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>😕</div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: '-0.02em',
                margin: '0 0 8px',
              }}
            >
              Ссылка не работает
            </h1>
            <p style={{ color: 'var(--text-soft)', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>
              {message}. Попроси пригласившего сгенерировать новую ссылку.
            </p>
            <a
              href="/parent"
              style={linkButtonStyle}
            >
              На главную
            </a>
          </div>
        </div>
      </main>
    );
  }

  // ── Валидный инвайт ─────────────────────────────────────────────────────────
  return (
    <main style={mainStyle}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <PipLogo size={36} />
        </div>

        {/* Invite hero */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>👨‍👩‍👧</div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: '-0.02em',
              margin: '0 0 8px',
              lineHeight: 1.15,
            }}
          >
            Тебя приглашают
            <br />
            в семью!
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-primary)' }}>{info.inviterName}</strong>{' '}
            приглашает тебя управлять семьёй{' '}
            <strong style={{ color: 'var(--text-primary)' }}>«{info.familyName}»</strong>{' '}
            в PIP вместе.
          </p>
        </div>

        {/* Что ты получишь */}
        <div
          style={{
            background: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {[
            { icon: '📋', text: 'Видеть и создавать задания' },
            { icon: '✅', text: 'Одобрять выполненные задачи' },
            { icon: '🎁', text: 'Управлять наградами магазина' },
            { icon: '📊', text: 'Следить за прогрессом детей' },
          ].map((item) => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        {isLoggedIn ? (
          // Уже залогинен — кнопка принять
          <AcceptInviteButton token={token} />
        ) : (
          // Не залогинен — кнопки регистрации / входа
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href={`/signup?invite=${encodeURIComponent(token)}`}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '14px 20px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-coral)',
                color: 'white',
                fontWeight: 700,
                fontSize: 15,
                textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}
            >
              Создать аккаунт и войти в семью
            </a>
            <a
              href={`/login?invite=${encodeURIComponent(token)}`}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px 20px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              У меня уже есть аккаунт
            </a>
          </div>
        )}

        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', margin: '16px 0 0', lineHeight: 1.5 }}>
          Ссылка действительна 7 дней и предназначена для одного человека.
        </p>
      </div>
    </main>
  );
}

const mainStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 20px',
  background: 'var(--bg-page)',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 400,
  background: 'var(--bg-surface)',
  borderRadius: 'var(--radius-2xl)',
  padding: '32px 28px',
  border: '1px solid var(--border-soft)',
  boxShadow: 'var(--shadow-lg)',
};

const linkButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 28px',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--bg-surface-2)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
  fontWeight: 600,
  fontSize: 14,
  textDecoration: 'none',
};
