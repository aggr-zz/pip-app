const RUSTORE = 'https://www.rustore.ru/catalog/app/ru.pipup.twa';
const REGISTER = '/login?mode=register';

export const metadata = {
  title: 'Как начать с PIP — памятка для родителей',
  description:
    'Установка на Android, iPhone и в браузере, первые шаги, как подключить ребёнка и как работает PIP каждый день.',
  openGraph: {
    title: 'Как начать с PIP',
    description: 'Установка, первые шаги и как подключить ребёнка — за пять минут.',
    type: 'article',
    url: 'https://pipup.ru/guide',
  },
};

export default function GuidePage() {
  return (
    <div className="pip-guide">
      {/* HEADER */}
      <header className="g-header">
        <div className="g-header-in">
          <a href="/" className="g-brand">
            <img src="/landing/coin.png" alt="PIP" width={32} height={32} />
            <span>pip</span>
          </a>
          <a href="/login" className="g-login">Войти</a>
        </div>
      </header>

      {/* HERO */}
      <section className="g-hero">
        <div className="g-eyebrow">Памятка</div>
        <h1 className="g-h1">Как начать с&nbsp;PIP</h1>
        <p className="g-lead">
          PIP превращает домашние дела в игру: ребёнок выполняет задания → получает
          PIP-монеты → копит и обменивает их на награды, о которых вы договорились.
          Без реальных денег и угроз. Настройка занимает пять минут.
        </p>
        <div className="g-hero-cta">
          <a href={RUSTORE} className="g-btn-gold" target="_blank" rel="noopener noreferrer">
            <img src="/landing/coin.png" width={20} height={20} alt="" /> Скачать в RuStore
          </a>
          <a href={REGISTER} className="g-btn-ghost">Создать аккаунт →</a>
        </div>
      </section>

      {/* 1. УСТАНОВКА */}
      <section className="g-sec">
        <div className="g-wrap">
          <h2 className="g-h2"><span className="g-num">1</span> Установить</h2>
          <div className="g-cards">
            <div className="g-card">
              <div className="g-card-ic">🤖</div>
              <h3>Android</h3>
              <p>
                Открой <a href={RUSTORE} target="_blank" rel="noopener noreferrer">страницу в RuStore</a> и
                нажми «Установить». Если RuStore ещё нет — поставь его с{' '}
                <a href="https://rustore.ru" target="_blank" rel="noopener noreferrer">rustore.ru</a>, потом вернись.
              </p>
              <p className="g-muted">Не хочешь RuStore? Можно как на iPhone — через браузер (рядом).</p>
            </div>

            <div className="g-card g-card--accent">
              <div className="g-card-ic">🍏</div>
              <h3>iPhone / iPad</h3>
              <p>В App Store приложения нет — PIP работает прямо из браузера:</p>
              <ol className="g-steps-mini">
                <li>Открой <b>pipup.ru</b> в <b>Safari</b></li>
                <li>Нажми «Поделиться» <span className="g-share">⬆️</span></li>
                <li>Выбери «На экран „Домой"» → «Добавить»</li>
              </ol>
              <p className="g-muted">Уведомления на iPhone приходят только из версии на «Домой».</p>
            </div>

            <div className="g-card">
              <div className="g-card-ic">💻</div>
              <h3>Компьютер / браузер</h3>
              <p>
                Просто зайди на <a href="/app">pipup.ru</a> — всё работает без установки,
                в любом браузере.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ПЕРВЫЕ ШАГИ */}
      <section className="g-sec g-sec--cream">
        <div className="g-wrap">
          <h2 className="g-h2"><span className="g-num">2</span> Первые пять минут</h2>
          <div className="g-steps">
            <Step n="1" title="Зарегистрируйся">
              Email и пароль или кнопкой «Войти через Яндекс» — входит сразу, без письма.
            </Step>
            <Step n="2" title="Добавь ребёнка">
              Имя, возраст, аватар и придумай <b>4-значный PIN</b> — он понадобится ребёнку для входа.
            </Step>
            <Step n="3" title="Готовые примеры уже на месте">
              Как только добавишь ребёнка, у него появятся примеры заданий, а в магазине — награды.
              Оставь их, измени под себя или удали.
            </Step>
            <Step n="4" title="Настрой под свою семью">
              Добавь свои задания (что делать, сколько PIP, как часто) и награды (на что копить:
              мультик, поход, игрушка).
            </Step>
          </div>
        </div>
      </section>

      {/* 3. КАК РЕБЁНОК ЗАХОДИТ */}
      <section className="g-sec">
        <div className="g-wrap">
          <h2 className="g-h2"><span className="g-num">3</span> Как ребёнок заходит</h2>
          <p className="g-sub">Ребёнку не нужна регистрация — только ссылка и PIN. Выбери удобное:</p>
          <div className="g-cards g-cards--2">
            <div className="g-card">
              <div className="g-card-ic">📲</div>
              <h3>С телефона ребёнка</h3>
              <p>
                В профиле ребёнка есть <b>ссылка и QR-код</b> + его <b>PIN</b>. Отправь ссылку или
                покажи QR — ребёнок открывает у себя, вводит PIN и попадает на свой экран.
              </p>
              <p className="g-muted">Ему тоже можно добавить PIP на экран «Домой».</p>
            </div>
            <div className="g-card">
              <div className="g-card-ic">👨‍👧</div>
              <h3>На твоём телефоне</h3>
              <p>
                В профиле ребёнка нажми <b>«Открыть режим … на этом телефоне»</b> и введи PIN —
                детский экран откроется прямо у тебя.
              </p>
              <p className="g-muted">PIN всегда виден тебе в профиле и меняется в «Управление профилем».</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. КАЖДЫЙ ДЕНЬ */}
      <section className="g-sec g-sec--ink">
        <div className="g-wrap">
          <h2 className="g-h2 g-h2--light"><span className="g-num g-num--light">4</span> Как это работает каждый день</h2>
          <div className="g-loop">
            <LoopStep ic="📋" text="Ребёнок открывает свой экран и видит задания на сегодня" />
            <LoopStep ic="✅" text="Выполнил → отмечает задание (с фото, если требуется)" />
            <LoopStep ic="👍" text="Ты подтверждаешь (или засчитывается автоматически)" />
            <LoopStep ic="🪙" text="Капают PIP-монеты, растёт баланс и «стрик»" />
            <LoopStep ic="🎁" text="Ребёнок копит и покупает награду — ты выдаёшь её в жизни" />
          </div>
        </div>
      </section>

      {/* 5. МЕЛОЧИ */}
      <section className="g-sec g-sec--cream">
        <div className="g-wrap">
          <h2 className="g-h2"><span className="g-num">5</span> Полезные мелочи</h2>
          <div className="g-notes">
            <div className="g-note"><span>🔔</span><div><b>Уведомления</b> — напоминания о заданиях и о том, что ребёнок что-то выполнил. На iPhone — только из версии на «Домой».</div></div>
            <div className="g-note"><span>👨‍👩‍👧</span><div><b>Второй родитель</b> — можно пригласить в профиле, зайдёт в ту же семью.</div></div>
            <div className="g-note"><span>🔑</span><div><b>Забыл пароль</b> — на входе есть «Забыли пароль?», придёт письмо для сброса.</div></div>
            <div className="g-note"><span>🎯</span><div><b>Цель-копилка</b> — ребёнок выбирает конкретную награду и видит прогресс к ней.</div></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="g-cta">
        <h2>Готовы попробовать?</h2>
        <p>Создайте семейный аккаунт за пять минут и запустите первые задания уже сегодня.</p>
        <div className="g-cta-row">
          <a href={REGISTER} className="g-btn-ink">Создать аккаунт →</a>
          <a href={RUSTORE} className="g-btn-ghost" target="_blank" rel="noopener noreferrer">Скачать в RuStore</a>
        </div>
        <p className="g-help">Нужна помощь? Пиши на <a href="mailto:saymien1@gmail.com">saymien1@gmail.com</a> — это ранняя версия, и твой отклик влияет на то, что будет дальше.</p>
      </section>

      {/* FOOTER */}
      <footer className="g-footer">
        <a href="/">На главную</a>
        <span>·</span>
        <a href="/privacy">Конфиденциальность</a>
        <span>·</span>
        <a href="/terms">Условия</a>
      </footer>

      <style>{GUIDE_CSS}</style>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="g-step">
      <div className="g-step-n">{n}</div>
      <div>
        <div className="g-step-t">{title}</div>
        <p className="g-step-p">{children}</p>
      </div>
    </div>
  );
}

function LoopStep({ ic, text }: { ic: string; text: string }) {
  return (
    <div className="g-loop-step">
      <div className="g-loop-ic">{ic}</div>
      <span>{text}</span>
    </div>
  );
}

const GUIDE_CSS = `
.pip-guide { font-family: var(--font-body, system-ui); background:#F4ECDC; color:#1C2742; -webkit-font-smoothing:antialiased; overflow-x:hidden; }
.pip-guide * { box-sizing:border-box; }
.pip-guide h1,.pip-guide h2,.pip-guide h3 { font-family: var(--font-display), system-ui; }
.pip-guide a { color:#C07F18; }

/* header */
.g-header { position:sticky; top:0; z-index:20; background:rgba(244,236,220,0.85); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid #E6DAC2; }
.g-header-in { max-width:820px; margin:0 auto; padding:12px clamp(16px,4vw,28px); display:flex; align-items:center; justify-content:space-between; }
.g-brand { display:flex; align-items:center; gap:9px; text-decoration:none; }
.g-brand img { border-radius:50%; filter:drop-shadow(0 3px 8px rgba(200,134,28,.4)); }
.g-brand span { font-weight:800; font-size:21px; letter-spacing:-0.5px; color:#1C2742; }
.g-login { text-decoration:none; color:#1C2742; font-weight:700; font-size:14px; padding:8px 16px; border-radius:999px; border:1.5px solid #DAC9A4; }

/* hero */
.g-hero { max-width:820px; margin:0 auto; padding:clamp(36px,6vw,64px) clamp(16px,4vw,28px) clamp(24px,4vw,40px); }
.g-eyebrow { font-size:12px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:#C07F18; }
.g-h1 { margin:10px 0 0; font-size:clamp(32px,6vw,50px); line-height:1.05; font-weight:900; letter-spacing:-1.2px; }
.g-lead { margin:16px 0 0; font-size:clamp(16px,2vw,18px); line-height:1.55; color:#5A6178; max-width:600px; font-weight:500; }
.g-hero-cta { margin-top:26px; display:flex; gap:12px; flex-wrap:wrap; }
.g-btn-gold { text-decoration:none; display:inline-flex; align-items:center; gap:8px; color:#1C2742; font-weight:800; font-size:16px; padding:13px 22px; border-radius:999px; background:linear-gradient(180deg,#F4C95A,#DF9E2C); box-shadow:0 8px 20px rgba(200,134,28,.4); }
.g-btn-gold img { border-radius:50%; }
.g-btn-ghost { text-decoration:none; color:#1C2742; font-weight:700; font-size:16px; padding:13px 22px; border-radius:999px; border:1.5px solid #D6C49C; background:#FFFCF6; }

/* sections */
.g-sec { padding:clamp(30px,5vw,52px) 0; }
.g-sec--cream { background:#FFFCF6; border-top:1px solid #EAE0CB; border-bottom:1px solid #EAE0CB; }
.g-sec--ink { background:#1C2742; }
.g-wrap { max-width:820px; margin:0 auto; padding:0 clamp(16px,4vw,28px); }
.g-h2 { display:flex; align-items:center; gap:12px; margin:0 0 20px; font-size:clamp(22px,3.4vw,30px); font-weight:900; letter-spacing:-0.6px; }
.g-h2--light { color:#FFFCF6; }
.g-num { flex-shrink:0; width:34px; height:34px; border-radius:50%; background:linear-gradient(180deg,#F4C95A,#DF9E2C); color:#1C2742; font-size:16px; font-weight:800; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(200,134,28,.35); }
.g-num--light { background:linear-gradient(180deg,#F4C95A,#DF9E2C); }
.g-sub { margin:-8px 0 20px; color:#5A6178; font-size:15px; font-weight:500; }

/* cards */
.g-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; }
.g-cards--2 { grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); }
.g-card { background:#FFFCF6; border:1px solid #EAE0CB; border-radius:18px; padding:18px 18px 16px; box-shadow:0 6px 18px rgba(70,48,12,.07); }
.g-sec--cream .g-card { background:#F7EFDF; }
.g-card--accent { border:1.5px solid #E0A02E; box-shadow:0 8px 22px rgba(200,134,28,.16); }
.g-card-ic { font-size:26px; margin-bottom:8px; }
.g-card h3 { margin:0 0 6px; font-size:17px; font-weight:800; }
.g-card p { margin:0 0 8px; font-size:14px; line-height:1.5; color:#5A6178; font-weight:500; }
.g-card p:last-child { margin-bottom:0; }
.g-muted { color:#8A8470 !important; font-size:12.5px !important; }
.g-steps-mini { margin:0 0 8px; padding-left:18px; font-size:14px; line-height:1.7; color:#40465C; }
.g-steps-mini b { color:#1C2742; }
.g-share { display:inline-block; }

/* numbered steps */
.g-steps { display:flex; flex-direction:column; gap:12px; }
.g-step { display:flex; gap:14px; align-items:flex-start; background:#F4ECDC; border:1px solid #EAE0CB; border-radius:16px; padding:14px 16px; }
.g-sec--cream .g-step { background:#F7EFDF; }
.g-step-n { flex-shrink:0; width:28px; height:28px; border-radius:50%; background:#1C2742; color:#FFFCF6; font-weight:800; font-size:14px; display:flex; align-items:center; justify-content:center; }
.g-step-t { font-weight:800; font-size:16px; margin-top:2px; }
.g-step-p { margin:4px 0 0; font-size:14px; line-height:1.5; color:#5A6178; font-weight:500; }
.g-step-p b { color:#1C2742; }

/* daily loop */
.g-loop { display:flex; flex-direction:column; gap:10px; }
.g-loop-step { display:flex; align-items:center; gap:14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:12px 16px; }
.g-loop-ic { font-size:22px; flex-shrink:0; }
.g-loop-step span { color:#E7E4DC; font-size:14.5px; line-height:1.45; font-weight:500; }

/* notes */
.g-notes { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
.g-note { display:flex; gap:12px; align-items:flex-start; background:#F7EFDF; border:1px solid #EAE0CB; border-radius:14px; padding:14px 16px; font-size:13.5px; line-height:1.5; color:#5A6178; font-weight:500; }
.g-note span { font-size:20px; flex-shrink:0; }
.g-note b { color:#1C2742; }

/* cta */
.g-cta { max-width:820px; margin:0 auto; padding:clamp(40px,6vw,64px) clamp(16px,4vw,28px); text-align:center; }
.g-cta h2 { margin:0; font-size:clamp(24px,4vw,36px); font-weight:900; letter-spacing:-0.8px; }
.g-cta > p { margin:12px auto 0; font-size:16px; color:#5A6178; max-width:460px; font-weight:500; }
.g-cta-row { margin-top:24px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
.g-btn-ink { text-decoration:none; color:#FFFCF6; font-weight:800; font-size:16px; padding:14px 26px; border-radius:999px; background:#1C2742; box-shadow:0 10px 24px rgba(28,39,66,.35); }
.g-help { margin-top:24px !important; font-size:13.5px !important; color:#8A8470 !important; }

/* footer */
.g-footer { display:flex; gap:12px; justify-content:center; align-items:center; padding:24px 16px 40px; font-size:13px; color:#8A8470; }
.g-footer a { color:#8A8470; text-decoration:none; }
.g-footer span { opacity:.5; }
`;
