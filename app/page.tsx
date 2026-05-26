import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LandingLoginForm } from '@/components/landing/LandingLoginForm';
import { PipLogo } from '@/components/ui/PipLogo';

export const metadata = {
  title: 'PIP — копилка хороших привычек',
  description:
    'Приложение для семей с детьми 6–16 лет. Превращает рутинные домашние дела в игру с монетами, стриками и наградами.',
  openGraph: {
    title: 'PIP — копилка хороших привычек',
    description: 'Приложение для семей с детьми 6–16 лет.',
    type: 'website',
  },
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    redirect(profile?.role === 'child' ? '/child' : '/parent');
  }

  return <LandingPage />;
}

/* ─────────────────────────────────────────────────────────
   Landing page — рендерится только для неавторизованных
   ───────────────────────────────────────────────────────── */

function LandingPage() {
  return (
    <div className="lp">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav__inner">
          <a href="/" aria-label="pip"><PipLogo size={28} /></a>
          <div className="lp-nav__links">
            <a href="#problem" className="lp-nav__link">Как устроено</a>
            <a href="#why" className="lp-nav__link">Почему pip</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero__inner">

          {/* LEFT — текст + форма входа */}
          <div className="lp-hero__copy">
            <div className="lp-badge">
              <span className="lp-badge__dot" />
              Закрытая бета · лето 2026
            </div>
            <h1 className="lp-hero__title">
              Полезные привычки у детей <em>копятся</em>,<br />как монетки.
            </h1>
            <p className="lp-hero__lede">
              Приложение для семей с детьми 6–16 лет. Превращает домашние дела
              в игру с монетами, стриками и наградами.
            </p>
            <LandingLoginForm />
          </div>

          {/* RIGHT — иллюстрация телефона */}
          <div className="lp-hero__art" aria-hidden="true">
            <div className="lp-phone-wrap">
              <div className="lp-popup">+5 pip за уборку! 🎉</div>
              <div className="lp-popup lp-popup--2">🔥 Стрик 5 дней!</div>

              <div className="lp-phone">
                <div className="lp-phone__bar"><div className="lp-phone__pill" /></div>
                <div className="lp-phone__body">
                  <div className="lp-phone__header">
                    <PipLogo size={18} />
                    <div className="lp-phone__av">🦁</div>
                  </div>
                  <div className="lp-phone__greeting">Привет, Лука! 👋</div>
                  <div className="lp-phone__balance">
                    <div className="lp-phone__bal-row">
                      <div>
                        <div className="lp-phone__bal-label">Твой баланс</div>
                        <div className="lp-phone__bal-val">42 pip</div>
                      </div>
                      <div className="lp-phone__bal-right">3 из 5<br />задач</div>
                    </div>
                    <div className="lp-phone__streak">🔥 5 дней подряд</div>
                    <div className="lp-phone__prog"><div className="lp-phone__prog-fill" /></div>
                  </div>
                  {[
                    { icon: '🪥', bg: '#DBEAE3', name: 'Почистить зубы',       done: true },
                    { icon: '📚', bg: '#FBEFC9', name: 'Домашнее задание',      coins: '+8 pip' },
                    { icon: '🛏', bg: '#FCE5DC', name: 'Заправить кровать',     done: true },
                    { icon: '🍽', bg: '#E6E8EE', name: 'Убрать посуду',         coins: '+5 pip' },
                  ].map((t) => (
                    <div key={t.name} className="lp-phone__task">
                      <div className="lp-phone__task-icon" style={{ background: t.bg }}>{t.icon}</div>
                      <div className="lp-phone__task-name">{t.name}</div>
                      {t.done
                        ? <div className="lp-phone__task-done">✓</div>
                        : <div className="lp-phone__task-coins">{t.coins}</div>
                      }
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating coins */}
              {['lp-fc lp-fc--1','lp-fc lp-fc--2','lp-fc lp-fc--3','lp-fc lp-fc--4','lp-fc lp-fc--5','lp-fc lp-fc--6','lp-fc lp-fc--7'].map((cls, i) => (
                <div key={i} className={cls}><div className="lp-fc__shine" /></div>
              ))}

              {/* Coin trail */}
              <div className="lp-coin-trail">
                {[1,2,3,4,5,6].map((n) => (
                  <div key={n} className={`lp-ct lp-ct--${n}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────── */}
      <section id="problem" className="lp-section lp-section--dark">
        <div className="lp-container">
          <div className="lp-sec-num lp-sec-num--gold">00 · Знакомо?</div>
          <h2 className="lp-sec-title" style={{ color: 'white' }}>
            Каждая семья через это проходит
          </h2>
          <p className="lp-sec-sub lp-sec-sub--light">
            Мы не придумали проблему — мы сами родители и знаем это изнутри.
          </p>

          <div className="lp-pains">
            {[
              { emoji: '🛒', title: '«Купи! Ну купи! Почему нет?»',
                text: 'Ребёнок видит игрушку — и немедленно хочет её. Объяснение «денег нет» не работает. Разговор заходит в тупик снова и снова.' },
              { emoji: '📱', title: 'Экранное время как валюта торга',
                text: '«Ещё 5 минут» превращается в час. Каждое ограничение — скандал. Приходится быть то полицейским, то виноватым. Это изматывает.' },
              { emoji: '💸', title: 'Деньги появляются из воздуха',
                text: 'Карманные деньги тратятся в первый же день. Понятий «накопить» и «выбрать что важнее» просто нет. Финансовая грамотность не появляется сама.' },
              { emoji: '😤', title: '«Это не моя работа» и точка',
                text: 'Просишь убрать комнату — нытьё или игнор. Ощущение что дети считают порядок дома чужой проблемой, а не делом всей семьи.' },
            ].map((p) => (
              <div key={p.title} className="lp-pain">
                <span className="lp-pain__emoji">{p.emoji}</span>
                <div className="lp-pain__title">{p.title}</div>
                <p className="lp-pain__text">{p.text}</p>
              </div>
            ))}
          </div>

          <div className="lp-bridge">
            <div className="lp-bridge__icon">💡</div>
            <div>
              <div className="lp-bridge__title">pip переводит это на язык, который дети понимают</div>
              <p className="lp-bridge__text">
                Не наказания и угрозы, а понятная система: сделал → заработал → потратил на то,
                что сам выбрал. Мотивация изнутри, а не давление снаружи.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section id="how" className="lp-section">
        <div className="lp-container">
          <div className="lp-sec-num lp-sec-num--coral">01 · Как работает</div>
          <h2 className="lp-sec-title">Три простых шага</h2>

          <div className="lp-steps">

            {/* Step 1 */}
            <div className="lp-step">
              <div className="lp-step__screen">
                <div className="lp-mp">
                  <div className="lp-mp__bar"><div className="lp-mp__pill" /></div>
                  <div className="lp-mp__body">
                    <div className="lp-mps-hdr">
                      <PipLogo size={12} />
                      <span style={{ fontSize: 7, color: '#9CA1B6' }}>👋 Анна</span>
                    </div>
                    <div className="lp-mps-title">Мои дети</div>
                    {[
                      { emoji: '🦁', color: '#EE6C4D', name: 'Лука', sub: '2 из 4 задач', bal: '42' },
                      { emoji: '🐼', color: '#5BA890', name: 'Соня', sub: '4 из 4 ✓',    bal: '78' },
                    ].map((c) => (
                      <div key={c.name} className="lp-mps-child">
                        <div className="lp-mps-av" style={{ background: c.color }}>{c.emoji}</div>
                        <div style={{ flex: 1 }}>
                          <div className="lp-mps-cname">{c.name}</div>
                          <div className="lp-mps-csub">{c.sub}</div>
                        </div>
                        <div className="lp-mps-cbal">{c.bal}</div>
                      </div>
                    ))}
                    <div className="lp-mps-title" style={{ marginTop: 6 }}>Задачи</div>
                    {[
                      { icon: '🪥', bg: '#DBEAE3', name: 'Зубы',   ok: true  },
                      { icon: '📚', bg: '#FBEFC9', name: 'Домашка', ok: false },
                      { icon: '🛏', bg: '#FCE5DC', name: 'Кровать', ok: true  },
                    ].map((t, idx) => (
                      <div key={t.name} className="lp-mps-trow" style={{ borderBottom: idx === 2 ? 'none' : undefined }}>
                        <div className="lp-mps-tico" style={{ background: t.bg }}>{t.icon}</div>
                        <div className="lp-mps-tname">{t.name}</div>
                        <div className={`lp-mps-badge ${t.ok ? 'lp-mps-badge--ok' : 'lp-mps-badge--wait'}`}>
                          {t.ok ? '✓' : '⏳'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lp-step__body">
                <div className="lp-step__num">1</div>
                <h3 className="lp-step__title">Родитель собирает список дел</h3>
                <p className="lp-step__text">Назначаешь задачи и стоимость в pip. Есть готовый стартовый набор — запустить можно за 5 минут.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="lp-step">
              <div className="lp-step__screen">
                <div className="lp-mp">
                  <div className="lp-mp__bar"><div className="lp-mp__pill" /></div>
                  <div className="lp-mp__body">
                    <div className="lp-mps-greeting">Привет, Лука! 👋</div>
                    <div className="lp-mps-bal2">
                      <div className="lp-mps-bal2-lbl">Твой баланс</div>
                      <div className="lp-mps-bal2-val">42 pip</div>
                      <div className="lp-mps-bal2-streak">🔥 5 дней подряд</div>
                    </div>
                    {[
                      { icon: '🪥', bg: '#DBEAE3', name: 'Почистить зубы',   done: true },
                      { icon: '📚', bg: '#FBEFC9', name: 'Домашнее задание', coins: '+8 pip' },
                      { icon: '🛏', bg: '#FCE5DC', name: 'Заправить кровать',done: true },
                      { icon: '🍽', bg: '#E6E8EE', name: 'Убрать посуду',    coins: '+5 pip' },
                    ].map((t) => (
                      <div key={t.name} className="lp-mps-trow2">
                        <div className="lp-mps-tico2" style={{ background: t.bg }}>{t.icon}</div>
                        <div className="lp-mps-tname2">{t.name}</div>
                        {t.done
                          ? <div className="lp-mps-done">✓</div>
                          : <div className="lp-mps-coins">{t.coins}</div>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lp-step__body">
                <div className="lp-step__num">2</div>
                <h3 className="lp-step__title">Ребёнок выполняет — копит pip</h3>
                <p className="lp-step__text">Сделал — тапнул «готово», монетки на счету. Стрики за серии без пропусков мотивируют делать это каждый день.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="lp-step">
              <div className="lp-step__screen">
                <div className="lp-mp">
                  <div className="lp-mp__bar"><div className="lp-mp__pill" /></div>
                  <div className="lp-mp__body">
                    <div className="lp-mps-shop-title">Магазин 🎁</div>
                    <div className="lp-mps-shop-bal">
                      <span style={{ fontSize: 6.5, color: '#D4A12E', fontWeight: 600 }}>У тебя</span>
                      <span style={{ fontFamily: 'var(--font-display,sans-serif)', fontWeight: 700, fontSize: 12, color: '#D4A12E' }}>42 pip</span>
                    </div>
                    {[
                      { icon: '🍕', name: 'Пицца на ужин',  cost: 30,  balance: 42 },
                      { icon: '🎮', name: 'Игровой вечер',  cost: 80,  balance: 42 },
                      { icon: '💰', name: 'Подарок на выбор', cost: 150, balance: 42 },
                    ].map((r) => {
                      const pct    = Math.min(100, Math.round((r.balance / r.cost) * 100));
                      const enough = r.balance >= r.cost;
                      return (
                        <div key={r.name} className="lp-mps-reward">
                          <div className="lp-mps-reward-top">
                            <div className="lp-mps-reward-ico">{r.icon}</div>
                            <div className="lp-mps-reward-name">{r.name}</div>
                            <div className="lp-mps-reward-cost">{r.cost}</div>
                          </div>
                          <div className="lp-mps-reward-bar">
                            <div className="lp-mps-reward-fill" style={{
                              width: `${pct}%`,
                              background: enough
                                ? '#5BA890'
                                : 'linear-gradient(90deg,#EE6C4D,#F2C14E)',
                            }} />
                          </div>
                          <div className="lp-mps-reward-lbl">
                            <span style={{ color: enough ? '#3D7A66' : undefined }}>
                              {enough ? '✓ хватает!' : `ещё ${r.cost - r.balance} pip`}
                            </span>
                            <span>{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="lp-step__body">
                <div className="lp-step__num">3</div>
                <h3 className="lp-step__title">Обменивает на награды</h3>
                <p className="lp-step__text">Магазин наград создаёшь сам. Шкала показывает сколько осталось до мечты — дети видят цель и стараются сильнее.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── WHY PIP ─────────────────────────────────────── */}
      <section id="why" className="lp-section lp-section--cream">
        <div className="lp-container">
          <div className="lp-sec-num lp-sec-num--coral">02 · Почему pip</div>
          <h2 className="lp-sec-title">Чем pip отличается</h2>

          <div className="lp-features">
            {[
              {
                icon: '🚀', cls: 'lp-fi--coral',
                title: 'Понятная мотивация для детей',
                text:  'Ребёнок видит баланс, прогресс к цели и стрик — всё на одном экране. Не «потому что надо», а «потому что хочу заработать».',
                tags:  [{ label: 'Стрики', cls: 'lp-ft--coral' }, { label: 'Прогресс к цели', cls: 'lp-ft--coral' }, { label: 'Достижения', cls: 'lp-ft--coral' }],
              },
              {
                icon: '⚙️', cls: 'lp-fi--mint',
                title: 'Гибкие настройки под семью',
                text:  'Свои задачи, свои награды, свои правила. Фото-доказательство, подтверждение родителем или автоматическое зачисление — выбираешь сам.',
                tags:  [{ label: 'Фото-подтверждение', cls: 'lp-ft--mint' }, { label: 'Расписание', cls: 'lp-ft--mint' }, { label: 'Свои правила', cls: 'lp-ft--mint' }],
              },
              {
                icon: '📱', cls: 'lp-fi--gold',
                title: 'Удобный дизайн для обоих',
                text:  'Два отдельных интерфейса — родительский и детский. Ребёнок заходит по PIN или QR-коду со своего телефона, без логинов.',
                tags:  [{ label: 'QR-вход', cls: 'lp-ft--gold' }, { label: 'PIN-код', cls: 'lp-ft--gold' }, { label: 'Свой экран', cls: 'lp-ft--gold' }],
              },
              {
                icon: '👁', cls: 'lp-fi--ink',
                title: 'Родитель всегда в курсе',
                text:  'История задач, начислений и трат. Видно кто старается, а кто пропускает — без слежки, но прозрачно.',
                tags:  [{ label: 'История задач', cls: 'lp-ft--ink' }, { label: 'Баланс в реальном времени', cls: 'lp-ft--ink' }],
              },
            ].map((f) => (
              <div key={f.title} className="lp-feature">
                <div className={`lp-fi ${f.cls}`}>{f.icon}</div>
                <h3 className="lp-feature__title">{f.title}</h3>
                <p className="lp-feature__text">{f.text}</p>
                <div className="lp-feature__tags">
                  {f.tags.map((t) => (
                    <span key={t.label} className={`lp-ftag ${t.cls}`}>{t.label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer__row">
            <div>
              <a href="/"><PipLogo size={24} /></a>
              <p className="lp-footer__tag">Обязанности как игра.</p>
            </div>
            <div className="lp-footer__links">
              <a href="mailto:hello@pipup.ru">hello@pipup.ru</a>
              <a href="/privacy">Политика конфиденциальности</a>
              <a href="/terms">Условия использования</a>
            </div>
          </div>
          <div className="lp-footer__bottom">© 2026 pip. Все права защищены.</div>
        </div>
      </footer>

      <style>{`
        /* ── Landing page — scope all styles under .lp ─── */

        /* CSS vars — landing always light, independent of system theme */
        .lp {
          --lp-coral:      #EE6C4D;
          --lp-coral-deep: #D85535;
          --lp-coral-soft: #FCE5DC;
          --lp-ink:        #1B2238;
          --lp-ink-2:      #3D4663;
          --lp-ink-soft:   #6B7290;
          --lp-ink-mute:   #9CA1B6;
          --lp-cream:      #F2EDE2;
          --lp-cream-deep: #ECE5D6;
          --lp-surface:    #FFFFFF;
          --lp-gold:       #F2C14E;
          --lp-gold-deep:  #D4A12E;
          --lp-gold-light: #FFEDB0;
          --lp-gold-soft:  #FBEFC9;
          --lp-mint:       #5BA890;
          --lp-mint-deep:  #3D7A66;
          --lp-mint-soft:  #DBEAE3;
          --lp-line:       #E8E1D0;
          --lp-line-soft:  #F0EBDD;

          background: var(--lp-cream);
          color:      var(--lp-ink);
          font-family: var(--font-body, 'Geist', system-ui, sans-serif);
          background-image:
            radial-gradient(ellipse 80% 50% at top left, rgba(238,108,77,.06), transparent 60%),
            radial-gradient(ellipse 60% 40% at bottom right, rgba(91,168,144,.05), transparent 60%);
          background-attachment: fixed;
          min-height: 100vh;
        }

        /* Container */
        .lp-container { max-width: 1100px; margin: 0 auto; padding: 0 28px; }
        @media (max-width: 720px) { .lp-container { padding: 0 20px; } }

        /* Nav */
        .lp-nav { background: rgba(242,237,226,.93); border-bottom: 1px solid var(--lp-line-soft); position: sticky; top: 0; z-index: 50; backdrop-filter: blur(14px); }
        .lp-nav__inner { max-width: 1100px; margin: 0 auto; padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; }
        .lp-nav__links { display: flex; gap: 22px; align-items: center; }
        .lp-nav__link { font-size: 14px; font-weight: 500; color: var(--lp-ink-2); text-decoration: none; transition: color .15s; }
        .lp-nav__link:hover { color: var(--lp-ink); }
        @media (max-width: 600px) { .lp-nav__link { display: none; } }

        /* Badge (hero) */
        .lp-badge { display: inline-flex; align-items: center; gap: 8px; background: var(--lp-surface); border: 1px solid var(--lp-line); padding: 7px 15px; border-radius: 100px; font-size: 12px; font-weight: 500; color: var(--lp-ink-2); margin-bottom: 24px; }
        .lp-badge__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--lp-coral); box-shadow: 0 0 0 3px var(--lp-coral-soft); flex-shrink: 0; }

        /* Hero */
        .lp-hero { padding: 72px 28px 0; overflow: hidden; }
        .lp-hero__inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        @media (max-width: 900px) { .lp-hero__inner { grid-template-columns: 1fr; gap: 40px; } .lp-hero { padding: 48px 20px 0; } }
        .lp-hero__copy { padding-bottom: 72px; }
        @media (max-width: 900px) { .lp-hero__copy { padding-bottom: 0; } }
        .lp-hero__title { font-family: var(--font-display, 'Bricolage Grotesque', sans-serif); font-weight: 600; font-size: clamp(40px, 5.5vw, 60px); line-height: .97; letter-spacing: -.03em; margin: 0 0 20px; }
        .lp-hero__title em { font-style: italic; font-weight: 500; color: var(--lp-coral); }
        .lp-hero__lede { font-size: 16.5px; line-height: 1.55; color: var(--lp-ink-2); max-width: 440px; margin: 0 0 28px; }

        /* Hero art */
        .lp-hero__art { display: flex; justify-content: center; align-items: flex-end; min-height: 520px; }
        @media (max-width: 900px) { .lp-hero__art { min-height: 380px; } }

        /* Phone */
        .lp-phone-wrap { position: relative; width: 256px; }
        .lp-phone { width: 256px; background: #F8F6F0; border-radius: 36px; border: 4px solid var(--lp-ink); box-shadow: 0 32px 64px rgba(27,34,56,.2); overflow: hidden; }
        .lp-phone__bar { height: 18px; background: var(--lp-ink); display: flex; justify-content: center; align-items: center; }
        .lp-phone__pill { width: 54px; height: 7px; background: rgba(255,255,255,.15); border-radius: 3px; }
        .lp-phone__body { padding: 16px 14px 20px; }
        .lp-phone__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .lp-phone__av { width: 32px; height: 32px; border-radius: 50%; background: var(--lp-coral); display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .lp-phone__greeting { font-family: var(--font-display, sans-serif); font-weight: 600; font-size: 14px; color: var(--lp-ink); margin-bottom: 10px; }
        .lp-phone__balance { background: var(--lp-ink); border-radius: 16px; padding: 14px 16px; margin-bottom: 12px; }
        .lp-phone__bal-row { display: flex; justify-content: space-between; align-items: flex-end; }
        .lp-phone__bal-label { font-size: 10px; color: rgba(255,255,255,.5); margin-bottom: 2px; }
        .lp-phone__bal-val { font-family: var(--font-display, sans-serif); font-weight: 700; font-size: 28px; color: var(--lp-gold); line-height: 1; }
        .lp-phone__bal-right { font-size: 10px; color: rgba(255,255,255,.5); text-align: right; }
        .lp-phone__streak { font-size: 10px; color: rgba(255,255,255,.65); margin-top: 5px; }
        .lp-phone__prog { height: 4px; background: rgba(255,255,255,.15); border-radius: 100px; overflow: hidden; margin-top: 7px; }
        .lp-phone__prog-fill { height: 100%; width: 60%; border-radius: 100px; background: linear-gradient(90deg, var(--lp-coral), var(--lp-gold)); }
        .lp-phone__task { display: flex; align-items: center; gap: 9px; padding: 9px 10px; background: white; border-radius: 11px; border: 1px solid var(--lp-line-soft); margin-bottom: 6px; }
        .lp-phone__task-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
        .lp-phone__task-name { font-size: 11px; font-weight: 600; color: var(--lp-ink); flex: 1; }
        .lp-phone__task-coins { font-size: 10px; font-weight: 700; color: var(--lp-gold-deep); }
        .lp-phone__task-done { width: 22px; height: 22px; border-radius: 50%; background: var(--lp-mint-soft); color: var(--lp-mint-deep); display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }

        /* Floating coins */
        .lp-fc { position: absolute; border-radius: 50%; background: radial-gradient(circle at 32% 28%, #FFEDB0 0%, #F2C14E 45%, #D4A12E 100%); box-shadow: inset 0 -3px 6px rgba(139,90,11,.25); }
        .lp-fc__shine { position: absolute; top: 14%; left: 18%; width: 30%; height: 22%; background: rgba(255,255,255,.5); border-radius: 100px; filter: blur(2px); }
        .lp-fc--1 { width: 44px; height: 44px; top: 16px; right: -24px; animation: lp-fcf 5s ease-in-out infinite; }
        .lp-fc--2 { width: 26px; height: 26px; top: 90px; left: -22px; animation: lp-fcf 6.5s ease-in-out infinite .8s; }
        .lp-fc--3 { width: 56px; height: 56px; bottom: 70px; right: -32px; animation: lp-fcf 4.5s ease-in-out infinite 1.3s; opacity: .9; }
        .lp-fc--4 { width: 20px; height: 20px; bottom: 44px; left: -15px; animation: lp-fcf 7s ease-in-out infinite .4s; }
        .lp-fc--5 { width: 32px; height: 32px; top: 160px; right: -42px; animation: lp-fcf 5.5s ease-in-out infinite .6s; opacity: .75; }
        .lp-fc--6 { width: 18px; height: 18px; top: 50px; left: -32px; animation: lp-fcf 4s ease-in-out infinite 1.8s; opacity: .6; }
        .lp-fc--7 { width: 38px; height: 38px; bottom: 160px; left: -46px; animation: lp-fcf 6s ease-in-out infinite .2s; opacity: .8; }
        @keyframes lp-fcf { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }

        /* Coin trail */
        .lp-coin-trail { position: absolute; right: -50px; top: 40px; bottom: 80px; display: flex; flex-direction: column; justify-content: space-around; align-items: center; pointer-events: none; }
        .lp-ct { border-radius: 50%; background: radial-gradient(circle at 32% 28%, #FFEDB0 0%, #F2C14E 45%, #D4A12E 100%); opacity: 0; animation: lp-trail 2.4s ease-in-out infinite; }
        .lp-ct--1 { width: 10px; height: 10px; animation-delay: .1s; }
        .lp-ct--2 { width: 7px; height: 7px; animation-delay: .4s; }
        .lp-ct--3 { width: 12px; height: 12px; animation-delay: .7s; }
        .lp-ct--4 { width: 8px; height: 8px; animation-delay: 1s; }
        .lp-ct--5 { width: 10px; height: 10px; animation-delay: 1.3s; }
        .lp-ct--6 { width: 7px; height: 7px; animation-delay: 1.6s; }
        @keyframes lp-trail { 0% { opacity: 0; transform: translateY(8px); } 30% { opacity: .65; } 70% { opacity: .3; } 100% { opacity: 0; transform: translateY(-20px); } }

        /* Popups */
        .lp-popup { position: absolute; top: 22px; left: -130px; background: white; border: 1px solid var(--lp-line); border-radius: 14px; padding: 8px 14px; font-size: 12px; font-weight: 600; color: var(--lp-ink); white-space: nowrap; box-shadow: 0 6px 20px rgba(27,34,56,.1); animation: lp-popin .5s ease; }
        .lp-popup::after { content: ''; position: absolute; right: -9px; top: 50%; transform: translateY(-50%); border: 5px solid transparent; border-left-color: var(--lp-line); }
        .lp-popup--2 { top: auto; bottom: 120px; left: auto; right: -140px; background: var(--lp-mint-soft); border-color: var(--lp-mint); color: var(--lp-mint-deep); animation-delay: .3s; }
        .lp-popup--2::after { display: none; }
        .lp-popup--2::before { content: ''; position: absolute; left: -9px; top: 50%; transform: translateY(-50%); border: 5px solid transparent; border-right-color: var(--lp-mint); }
        @keyframes lp-popin { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: scale(1); } }

        /* Sections */
        .lp-section { padding: 80px 28px; }
        .lp-section--dark { background: var(--lp-ink); color: white; padding: 80px 28px; }
        .lp-section--cream { background: var(--lp-cream-deep); }
        @media (max-width: 720px) { .lp-section, .lp-section--dark, .lp-section--cream { padding: 56px 20px; } }
        .lp-sec-num { font-family: var(--font-display, sans-serif); font-size: 12px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 10px; }
        .lp-sec-num--coral { color: var(--lp-coral); }
        .lp-sec-num--gold  { color: var(--lp-gold); }
        .lp-sec-title { font-family: var(--font-display, sans-serif); font-weight: 600; font-size: clamp(30px, 4vw, 44px); letter-spacing: -.02em; margin: 0 0 12px; line-height: 1.05; }
        .lp-sec-sub { font-size: 17px; line-height: 1.55; color: var(--lp-ink-soft); max-width: 600px; margin: 0 0 48px; }
        .lp-sec-sub--light { color: rgba(255,255,255,.6); }

        /* Pains */
        .lp-pains { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 40px; }
        @media (max-width: 640px) { .lp-pains { grid-template-columns: 1fr; } }
        .lp-pain { border-radius: 20px; padding: 24px 22px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); }
        .lp-pain__emoji { font-size: 32px; margin-bottom: 12px; display: block; }
        .lp-pain__title { font-family: var(--font-display, sans-serif); font-weight: 600; font-size: 19px; margin: 0 0 8px; line-height: 1.2; color: white; }
        .lp-pain__text { font-size: 14px; line-height: 1.55; margin: 0; color: rgba(255,255,255,.65); }
        .lp-bridge { background: var(--lp-coral); border-radius: 24px; padding: 32px 36px; display: flex; align-items: center; gap: 28px; }
        .lp-bridge__icon { font-size: 40px; flex-shrink: 0; }
        .lp-bridge__title { font-family: var(--font-display, sans-serif); font-weight: 600; font-size: 22px; color: white; margin: 0 0 6px; }
        .lp-bridge__text { font-size: 15px; color: rgba(255,255,255,.88); margin: 0; line-height: 1.5; }
        @media (max-width: 640px) { .lp-bridge { flex-direction: column; gap: 16px; padding: 24px; } }

        /* Steps */
        .lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        @media (max-width: 880px) { .lp-steps { grid-template-columns: 1fr; } }
        .lp-step { background: var(--lp-surface); border-radius: 22px; border: 1px solid var(--lp-line-soft); overflow: hidden; }
        .lp-step__screen { background: linear-gradient(160deg, #252e4a 0%, var(--lp-ink) 100%); padding: 24px 16px 20px; display: flex; justify-content: center; min-height: 248px; align-items: center; }
        .lp-step__body { padding: 22px 22px 24px; }
        .lp-step__num { font-family: var(--font-display, sans-serif); font-weight: 700; font-size: 14px; color: white; background: var(--lp-ink); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .lp-step__title { font-family: var(--font-display, sans-serif); font-weight: 600; font-size: 18px; margin: 0 0 10px; line-height: 1.2; }
        .lp-step__text { font-size: 13.5px; line-height: 1.55; color: var(--lp-ink-soft); margin: 0; }

        /* Mini phone (inside steps) */
        .lp-mp { width: 136px; background: #F8F6F0; border-radius: 20px; overflow: hidden; border: 3px solid #2a3350; box-shadow: 0 12px 32px rgba(0,0,0,.3); }
        .lp-mp__bar { height: 12px; background: #1a2035; display: flex; justify-content: center; align-items: center; }
        .lp-mp__pill { width: 28px; height: 4px; background: rgba(255,255,255,.15); border-radius: 2px; }
        .lp-mp__body { padding: 9px; }
        .lp-mps-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
        .lp-mps-title { font-size: 8px; font-weight: 700; color: var(--lp-ink); margin-bottom: 5px; font-family: var(--font-display, sans-serif); }
        .lp-mps-child { border-radius: 9px; padding: 6px 8px; margin-bottom: 4px; display: flex; align-items: center; gap: 5px; background: var(--lp-ink); }
        .lp-mps-av { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
        .lp-mps-cname { font-size: 7.5px; font-weight: 600; color: white; font-family: var(--font-display, sans-serif); }
        .lp-mps-csub { font-size: 6px; color: rgba(255,255,255,.5); }
        .lp-mps-cbal { font-size: 9px; font-weight: 700; color: var(--lp-gold); }
        .lp-mps-trow { display: flex; align-items: center; gap: 5px; padding: 4px 0; border-bottom: 1px solid var(--lp-line-soft); }
        .lp-mps-tico { width: 17px; height: 17px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; }
        .lp-mps-tname { font-size: 7px; color: var(--lp-ink); flex: 1; font-weight: 500; }
        .lp-mps-badge { font-size: 6px; font-weight: 700; padding: 2px 4px; border-radius: 100px; }
        .lp-mps-badge--ok   { background: var(--lp-mint-soft); color: var(--lp-mint-deep); }
        .lp-mps-badge--wait { background: var(--lp-gold-soft); color: #7A5A00; }
        .lp-mps-greeting { font-size: 10px; font-weight: 700; color: var(--lp-ink); margin-bottom: 6px; font-family: var(--font-display, sans-serif); }
        .lp-mps-bal2 { background: var(--lp-ink); border-radius: 8px; padding: 7px 8px; margin-bottom: 6px; }
        .lp-mps-bal2-lbl { font-size: 6.5px; color: rgba(255,255,255,.5); margin-bottom: 1px; }
        .lp-mps-bal2-val { font-family: var(--font-display, sans-serif); font-weight: 700; font-size: 16px; color: var(--lp-gold); line-height: 1; }
        .lp-mps-bal2-streak { font-size: 6.5px; color: rgba(255,255,255,.6); margin-top: 2px; }
        .lp-mps-trow2 { display: flex; align-items: center; gap: 5px; padding: 4px 6px; background: white; border-radius: 7px; border: 1px solid var(--lp-line-soft); margin-bottom: 4px; }
        .lp-mps-tico2 { width: 20px; height: 20px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
        .lp-mps-tname2 { font-size: 7.5px; font-weight: 600; color: var(--lp-ink); flex: 1; }
        .lp-mps-done  { width: 15px; height: 15px; border-radius: 50%; background: var(--lp-mint-soft); color: var(--lp-mint-deep); display: flex; align-items: center; justify-content: center; font-size: 9px; }
        .lp-mps-coins { font-size: 7px; font-weight: 700; color: var(--lp-gold-deep); }
        .lp-mps-shop-title { font-size: 10px; font-weight: 700; color: var(--lp-ink); margin-bottom: 6px; font-family: var(--font-display, sans-serif); }
        .lp-mps-shop-bal { background: var(--lp-gold-soft); border-radius: 7px; padding: 5px 7px; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
        .lp-mps-reward { background: white; border: 1px solid var(--lp-line-soft); border-radius: 8px; padding: 6px; margin-bottom: 4px; }
        .lp-mps-reward-top { display: flex; align-items: center; gap: 5px; margin-bottom: 4px; }
        .lp-mps-reward-ico { width: 24px; height: 24px; border-radius: 6px; background: var(--lp-gold-soft); display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
        .lp-mps-reward-name { font-size: 7.5px; font-weight: 600; color: var(--lp-ink); flex: 1; }
        .lp-mps-reward-cost { font-size: 7.5px; font-weight: 700; color: var(--lp-gold-deep); }
        .lp-mps-reward-bar { height: 3px; background: var(--lp-line-soft); border-radius: 100px; overflow: hidden; }
        .lp-mps-reward-fill { height: 100%; border-radius: 100px; }
        .lp-mps-reward-lbl { display: flex; justify-content: space-between; font-size: 6px; color: var(--lp-ink-mute); margin-top: 2px; }

        /* Features */
        .lp-features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        @media (max-width: 640px) { .lp-features { grid-template-columns: 1fr; } }
        .lp-feature { background: var(--lp-surface); padding: 28px 24px; border-radius: 22px; border: 1px solid var(--lp-line-soft); }
        .lp-fi { width: 44px; height: 44px; border-radius: 13px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 22px; }
        .lp-fi--coral { background: var(--lp-coral-soft); }
        .lp-fi--gold  { background: var(--lp-gold-soft); }
        .lp-fi--mint  { background: var(--lp-mint-soft); }
        .lp-fi--ink   { background: #E6E8EE; }
        .lp-feature__title { font-family: var(--font-display, sans-serif); font-weight: 600; font-size: 19px; letter-spacing: -.01em; margin: 0 0 8px; line-height: 1.2; }
        .lp-feature__text { font-size: 13.5px; line-height: 1.55; color: var(--lp-ink-soft); margin: 0 0 12px; }
        .lp-feature__tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .lp-ftag { font-size: 11.5px; font-weight: 500; padding: 4px 10px; border-radius: 100px; }
        .lp-ft--coral { background: var(--lp-coral-soft); color: var(--lp-coral-deep); }
        .lp-ft--gold  { background: var(--lp-gold-soft);  color: var(--lp-gold-deep);  }
        .lp-ft--mint  { background: var(--lp-mint-soft);  color: var(--lp-mint-deep);  }
        .lp-ft--ink   { background: #E6E8EE; color: var(--lp-ink-2); }

        /* Footer */
        .lp-footer { background: var(--lp-cream-deep); padding: 52px 28px 32px; }
        .lp-footer__row { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--lp-line); flex-wrap: wrap; }
        .lp-footer__tag { font-size: 13px; color: var(--lp-ink-soft); margin: 8px 0 0; }
        .lp-footer__links { display: flex; gap: 20px; flex-wrap: wrap; }
        .lp-footer__links a { font-size: 13px; color: var(--lp-ink-2); transition: color .15s; }
        .lp-footer__links a:hover { color: var(--lp-ink); }
        .lp-footer__bottom { margin-top: 20px; font-size: 12px; color: var(--lp-ink-mute); }
      `}</style>
    </div>
  );
}
