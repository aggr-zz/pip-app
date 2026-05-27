import Link from 'next/link';
import { PipLogo } from '@/components/ui/PipLogo';

export const metadata = {
  title: 'Политика конфиденциальности — PIP',
};

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <header style={{ marginBottom: 40 }}>
          <PipLogo size={36} href="/" />
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 36,
            letterSpacing: '-0.025em',
            margin: '24px 0 8px',
            lineHeight: 1.05,
          }}>
            Политика конфиденциальности
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, margin: 0 }}>
            Последнее обновление: 27 мая 2026 г.
          </p>
        </header>

        <DocSection title="1. Какие данные мы собираем">
          <p><strong>Данные родителя (владельца аккаунта):</strong></p>
          <ul>
            <li>Email-адрес — для входа и уведомлений.</li>
            <li>Имя — отображается в интерфейсе.</li>
            <li>Дата регистрации и последнего входа.</li>
            <li>Push-токен устройства — если вы разрешили уведомления (можно отозвать в любой момент).</li>
          </ul>
          <p><strong>Данные детей:</strong></p>
          <ul>
            <li>Имя ребёнка — вводится родителем, используется только внутри семейного аккаунта.</li>
            <li>Год рождения (опционально) — для отображения возраста.</li>
            <li>PIN-код для входа — хранится в зашифрованном виде.</li>
            <li>Аватар — эмодзи или фото, загружаемое родителем.</li>
            <li>История заданий, баланс монет, стрик.</li>
            <li>Фотографии выполненных заданий — загружаются самим ребёнком при необходимости.</li>
          </ul>
          <p><strong>Технические данные:</strong></p>
          <ul>
            <li>IP-адрес, тип браузера — стандартные серверные логи, хранятся не более 30 дней.</li>
            <li>Мы не используем рекламные трекеры и не подключаем аналитику третьих сторон
            (Google Analytics, Facebook Pixel и т. п.).</li>
          </ul>
        </DocSection>

        <DocSection title="2. Как мы используем данные">
          <ul>
            <li>Предоставление функциональности сервиса: задания, монеты, история, уведомления.</li>
            <li>Отправка транзакционных писем: подтверждение email, сброс пароля.</li>
            <li>Push-уведомления о событиях в приложении (только с вашего разрешения).</li>
            <li>Техническая поддержка по обращениям.</li>
          </ul>
          <p>
            <strong>Мы не продаём, не передаём и не используем ваши данные для рекламы.</strong>{' '}
            Данные детей не используются ни в каких целях, кроме работы вашего семейного аккаунта.
          </p>
        </DocSection>

        <DocSection title="3. Где хранятся данные">
          <p>
            Данные хранятся на серверах Supabase (PostgreSQL). Серверы расположены в регионе
            Западная Европа (Frankfurt, AWS eu-central-1). Статические файлы и фотографии
            хранятся в Supabase Storage.
          </p>
          <p>
            Сервис работает на платформе Vercel (CDN-узлы по всему миру). Запросы к базе данных
            обрабатываются только в серверном контексте.
          </p>
        </DocSection>

        <DocSection title="4. Передача данных третьим лицам">
          <p>Мы передаём минимальный объём данных следующим сервисам:</p>
          <ul>
            <li><strong>Supabase</strong> — база данных, аутентификация, хранилище файлов.</li>
            <li><strong>Vercel</strong> — хостинг и серверный рендеринг.</li>
            <li>Ни один из этих сервисов не получает данные о детях в объёме, превышающем
            необходимый для хранения.</li>
          </ul>
          <p>
            Мы не передаём данные рекламным сетям, брокерам данных или иным третьим лицам.
          </p>
        </DocSection>

        <DocSection title="5. Защита данных детей">
          <p>
            Дети не регистрируются в системе самостоятельно и не имеют прямого доступа к
            интернет-функциям. Все данные ребёнка создаются и контролируются родителем.
            Имя ребёнка видно только внутри семейного аккаунта и не публикуется ни в каких
            общедоступных местах.
          </p>
          <p>
            Фотографии, загруженные в рамках фото-отчётов по заданиям, доступны только
            родителю в его аккаунте и удаляются вместе с аккаунтом при его удалении.
          </p>
        </DocSection>

        <DocSection title="6. Ваши права">
          <ul>
            <li><strong>Доступ:</strong> вы можете запросить выгрузку всех ваших данных.</li>
            <li><strong>Исправление:</strong> вы можете изменить любые данные прямо в приложении.</li>
            <li><strong>Удаление:</strong> вы можете запросить полное удаление аккаунта и данных.
            Мы выполним запрос в течение 30 дней.</li>
            <li><strong>Отзыв согласия:</strong> вы можете отключить push-уведомления в настройках
            браузера или приложения в любой момент.</li>
          </ul>
          <p>
            Для реализации прав напишите на{' '}
            <a href="mailto:hi@pipup.ru" style={{ color: 'var(--color-coral)' }}>hi@pipup.ru</a>.
          </p>
        </DocSection>

        <DocSection title="7. Срок хранения данных">
          <p>
            Данные хранятся пока существует аккаунт. После удаления аккаунта все данные
            (включая данные детей, историю заданий и фотографии) удаляются в течение 30 дней.
            Резервные копии уничтожаются в течение 90 дней после основного удаления.
          </p>
        </DocSection>

        <DocSection title="8. Файлы cookie">
          <p>
            Мы используем только технически необходимые cookie: сессионный токен аутентификации
            Supabase и токен детского режима. Мы не используем рекламные или аналитические cookie.
          </p>
        </DocSection>

        <DocSection title="9. Уведомления об изменениях">
          <p>
            Если политика конфиденциальности существенно изменится, мы уведомим вас по email
            минимум за 14 дней до вступления изменений в силу.
          </p>
        </DocSection>

        <DocSection title="10. Контакты">
          <p>
            Вопросы по конфиденциальности:{' '}
            <a href="mailto:hi@pipup.ru" style={{ color: 'var(--color-coral)' }}>hi@pipup.ru</a>
          </p>
        </DocSection>

        <div style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: '1px solid var(--border-soft)',
          display: 'flex',
          gap: 24,
          fontSize: 14,
        }}>
          <Link href="/terms" style={{ color: 'var(--color-coral)', fontWeight: 500 }}>
            ← Пользовательское соглашение
          </Link>
          <Link href="/" style={{ color: 'var(--text-soft)' }}>
            На главную →
          </Link>
        </div>
      </div>

      <style>{docStyles}</style>
    </main>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 18,
        letterSpacing: '-0.01em',
        margin: '0 0 12px',
        color: 'var(--text-primary)',
      }}>
        {title}
      </h2>
      <div className="doc-body">
        {children}
      </div>
    </section>
  );
}

const docStyles = `
  .doc-body p {
    margin: 0 0 12px;
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-secondary, var(--text-soft));
  }
  .doc-body p:last-child { margin-bottom: 0; }
  .doc-body ul {
    margin: 0 0 12px;
    padding-left: 20px;
  }
  .doc-body li {
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-secondary, var(--text-soft));
    margin-bottom: 6px;
  }
  .doc-body strong { color: var(--text-primary); }
`;
