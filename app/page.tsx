import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LandingGallery } from '@/components/landing/LandingGallery';

export const metadata = {
  title: 'PIP — полезные привычки у детей копятся, как монетки',
  description:
    'PIP превращает домашние дела и рутину в игру с монетами, стриками и наградами. Приложение для семей с детьми 6–16 лет.',
  openGraph: {
    title: 'PIP — полезные привычки у детей копятся, как монетки',
    description: 'Обязанности как игра. Приложение для семей с детьми 6–16 лет.',
    type: 'website',
    url: 'https://pipup.ru',
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

  return <Landing />;
}

// ─── Данные секций ──────────────────────────────────────────────────────────────

const PROBLEMS = [
  { img: '/landing/p-buy.jpg', tag: 'В магазине', tilt: '-1deg', pos: 'center 32%', title: '«Купи! Ну купи!»', body: 'Ребёнок видит игрушку — и немедленно хочет её. «Денег нет» не работает, разговор заходит в тупик снова и снова.' },
  { img: '/landing/p-screen.jpg', tag: 'Экраны', tilt: '0.8deg', pos: 'center 28%', title: 'Экранное время как валюта торга', body: '«Ещё 5 минут» превращается в час. Каждое ограничение — скандал. Приходится быть то полицейским, то виноватым.' },
  { img: '/landing/p-money.jpg', tag: 'Деньги', tilt: '-0.8deg', pos: 'center 30%', title: 'Деньги появляются из воздуха', body: 'Карманные тратятся в первый же день. Понятий «накопить» и «выбрать что важнее» просто нет.' },
  { img: '/landing/p-mess.jpg', tag: 'Беспорядок', tilt: '1deg', pos: 'center 26%', title: '«Это не моя работа»', body: 'Просишь убрать комнату — нытьё или игнор. Будто порядок дома — чужая проблема, а не дело всей семьи.' },
];

const BENEFITS = [
  { icon: '🚀', title: 'Понятная мотивация для детей', body: 'Баланс, прогресс к цели и стрик — всё на одном экране. Не «потому что надо», а «потому что хочу заработать».', tags: ['Стрики', 'Прогресс к цели', 'Достижения'] },
  { icon: '⚙️', title: 'Гибкие настройки под семью', body: 'Свои задачи, свои награды, свои правила. Фото-доказательство, подтверждение родителем или авто-зачисление.', tags: ['Фото-подтверждение', 'Расписание'] },
  { icon: '📲', title: 'Удобно обоим', body: 'Два интерфейса — родительский и детский. Ребёнок заходит по PIN или QR со своего телефона, без логинов.', tags: ['QR-вход', 'PIN-код'] },
  { icon: '👁', title: 'Родитель всегда в курсе', body: 'История задач, начислений и трат. Видно, кто старается, а кто пропускает — без слежки, но прозрачно.', tags: ['История', 'Баланс в реальном времени'] },
];

const REGISTER = '/login?mode=register';

// ─── Лендинг ────────────────────────────────────────────────────────────────────

function Landing() {
  return (
    <div className="pip-lp">
      {/* HEADER */}
      <header className="lp-header">
        <div className="lp-header-in">
          <a href="#top" className="lp-brand">
            <img src="/landing/coin.png" alt="PIP" width={34} height={34} />
            <span>pip</span>
          </a>
          <nav className="lp-nav">
            <a href="#problem" className="nav-link">Знакомо?</a>
            <a href="#how" className="nav-link">Как работает</a>
            <a href="#why" className="nav-link">Почему pip</a>
            <a href="/login" className="lp-login-btn">Войти</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="lp-hero">
        <img src="/landing/coin.png" width={78} height={78} alt="" aria-hidden className="hero-deco lp-coin" style={{ top: '14%', left: '5%', ['--r' as string]: '-12deg', animation: 'floatY 6s ease-in-out infinite' }} />
        <img src="/landing/coin.png" width={46} height={46} alt="" aria-hidden className="hero-deco lp-coin" style={{ top: '62%', left: '2.5%', ['--r' as string]: '10deg', animation: 'floatY2 5s ease-in-out infinite' }} />
        <img src="/landing/coin.png" width={54} height={54} alt="" aria-hidden className="hero-deco lp-coin" style={{ top: '8%', right: '3%', ['--r' as string]: '8deg', animation: 'floatY2 7s ease-in-out infinite' }} />
        <span className="hero-deco lp-spark" style={{ top: '24%', left: '46%', fontSize: 26, animation: 'twinkle 3.2s ease-in-out infinite' }}>✦</span>
        <span className="hero-deco lp-spark" style={{ top: '70%', right: '46%', fontSize: 18, animation: 'twinkle 2.6s ease-in-out infinite .6s' }}>✦</span>
        <span className="hero-deco lp-spark" style={{ top: '14%', right: '30%', fontSize: 20, animation: 'twinkle 3.6s ease-in-out infinite .3s' }}>✦</span>

        <div className="lp-hero-in">
          <div>
            <div className="lp-badge"><i />Закрытая бета · лето 2026</div>
            <h1 className="lp-h1">
              Полезные привычки у детей <span className="grad">копятся, как монетки.</span>
            </h1>
            <p className="lp-sub">
              PIP превращает домашние дела и скучную рутину в увлекательную игру с монетами и наградами. Приложение для семей с детьми&nbsp;6–16&nbsp;лет.
            </p>
            <div className="lp-cta-row">
              <a href={REGISTER} className="lp-btn-gold">
                <img src="/landing/coin.png" width={22} height={22} alt="" /> Создать аккаунт
              </a>
              <a href="/login" className="lp-btn-ghost">Войти</a>
            </div>
            <div className="lp-hint"><span style={{ fontSize: 16 }}>⚡</span> Настройки за 5 минут</div>
          </div>

          <div className="lp-hero-art">
            <div className="lp-poster">
              <img src="/landing/family-poster.jpg" alt="Семья PIP" />
            </div>
            <div className="lp-chip-streak">🔥 Стрик 5 дней</div>
            <div className="lp-chip-coin"><img src="/landing/coin.png" width={20} height={20} alt="" /> +5 pip за уборку</div>
          </div>
        </div>
      </section>

      {/* GALLERY (клиентский — горизонтальный скролл) */}
      <LandingGallery />

      {/* PROBLEM */}
      <section id="problem" className="lp-sec-tan">
        <div className="lp-wrap">
          <div className="lp-eyebrow">02 · Знакомо?</div>
          <h2 className="lp-h2">Каждая семья через это проходит</h2>
          <p className="lp-lead">Мы не придумали проблему — мы сами родители и знаем это изнутри.</p>

          <div className="lp-prob-grid">
            {PROBLEMS.map((p) => (
              <div className="lp-prob" key={p.title} style={{ transform: `rotate(${p.tilt})` }}>
                <div className="lp-prob-img">
                  <img src={p.img} alt={p.title} loading="lazy" style={{ objectPosition: p.pos }} />
                  <div className="lp-prob-grad" />
                  <div className="lp-prob-cap">
                    <span className="lp-tag">{p.tag}</span>
                    <h3>{p.title}</h3>
                  </div>
                </div>
                <p>{p.body}</p>
              </div>
            ))}
          </div>

          <div className="lp-prob-cta">
            <img src="/landing/coin.png" width={72} height={72} alt="" className="lp-prob-cta-coin" />
            <div style={{ flex: 1, minWidth: 260 }}>
              <h3>pip переводит это на язык, который дети понимают</h3>
              <p>Не наказания и угрозы, а понятная система: сделал → заработал → потратил на то, что сам выбрал. Мотивация изнутри, а не давление снаружи.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section id="why" className="lp-sec-cream">
        <div className="lp-wrap">
          <div className="lp-eyebrow">03 · Почему pip</div>
          <h2 className="lp-h2">Чем pip отличается</h2>

          <div className="lp-why-grid">
            {BENEFITS.map((b) => (
              <div className="lp-benefit" key={b.title}>
                <div className="lp-benefit-ic">{b.icon}</div>
                <h3>{b.title}</h3>
                <p>{b.body}</p>
                <div className="lp-btags">
                  {b.tags.map((t) => <span className="lp-btag" key={t}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="login" className="lp-cta-sec">
        <div className="lp-cta-box">
          <img src="/landing/coin.png" width={64} height={64} alt="" aria-hidden className="lp-coin" style={{ top: '14%', left: '8%', ['--r' as string]: '-14deg', animation: 'floatY 6s ease-in-out infinite' }} />
          <img src="/landing/coin.png" width={44} height={44} alt="" aria-hidden className="lp-coin" style={{ bottom: '16%', left: '16%', ['--r' as string]: '12deg', animation: 'floatY2 5s ease-in-out infinite' }} />
          <img src="/landing/coin.png" width={58} height={58} alt="" aria-hidden className="lp-coin" style={{ top: '20%', right: '9%', ['--r' as string]: '10deg', animation: 'floatY2 7s ease-in-out infinite' }} />
          <img src="/landing/coin.png" width={38} height={38} alt="" aria-hidden className="lp-coin" style={{ bottom: '20%', right: '18%', ['--r' as string]: '-8deg', animation: 'floatY 5.5s ease-in-out infinite' }} />
          <h2 className="lp-cta-h2">Готовы превратить обязанности в игру?</h2>
          <p className="lp-cta-p">Создайте семейный аккаунт за пять минут и запустите первые задания уже сегодня.</p>
          <div className="lp-cta-actions">
            <a href={REGISTER} className="lp-btn-ink">Создать аккаунт →</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-in">
          <div style={{ maxWidth: 300 }}>
            <div className="lp-footer-brand">
              <img src="/landing/coin.png" width={32} height={32} alt="" />
              <span>pip</span>
            </div>
            <p className="lp-footer-tag">Обязанности как игра. Полезные привычки у детей копятся, как монетки.</p>
          </div>
          <div className="lp-footer-cols">
            <div className="lp-footer-col">
              <span className="lp-footer-h">Продукт</span>
              <a href="#how">Как работает</a>
              <a href="#why">Почему pip</a>
              <a href="/guide">Как начать</a>
              <a href={REGISTER}>Создать аккаунт</a>
            </div>
            <div className="lp-footer-col">
              <span className="lp-footer-h">Контакты</span>
              <a href="mailto:hello@pipup.ru">hello@pipup.ru</a>
              <a href="/privacy">Политика конфиденциальности</a>
              <a href="/terms">Условия использования</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-copy">© 2026 pip. Все права защищены.</div>
      </footer>

      <style>{LP_CSS}</style>
    </div>
  );
}

const LP_CSS = `
.pip-lp { font-family: var(--font-body, system-ui); background:#F4ECDC; color:#1C2742; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
.pip-lp * { box-sizing:border-box; }
.pip-lp ::selection { background:#F4C95A; color:#1C2742; }
.pip-lp h1, .pip-lp h2, .pip-lp h3 { font-family: var(--font-display), system-ui; }
.pip-lp a { -webkit-tap-highlight-color: transparent; }
@keyframes floatY { 0%,100%{transform:translateY(0) rotate(var(--r,0deg));} 50%{transform:translateY(-18px) rotate(var(--r,0deg));} }
@keyframes floatY2 { 0%,100%{transform:translateY(0) rotate(var(--r,0deg));} 50%{transform:translateY(14px) rotate(var(--r,0deg));} }
@keyframes twinkle { 0%,100%{opacity:.25;transform:scale(.8);} 50%{opacity:1;transform:scale(1.1);} }

/* header */
.lp-header { position:sticky; top:0; z-index:50; background:rgba(244,236,220,0.82); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px); border-bottom:1px solid #E6DAC2; }
.lp-header-in { max-width:1180px; margin:0 auto; padding:14px clamp(18px,4vw,40px); display:flex; align-items:center; justify-content:space-between; gap:18px; flex-wrap:wrap; }
.lp-brand { display:flex; align-items:center; gap:10px; text-decoration:none; }
.lp-brand img { border-radius:50%; filter:drop-shadow(0 4px 10px rgba(200,134,28,.4)); }
.lp-brand span { font-weight:800; font-size:23px; letter-spacing:-0.5px; color:#1C2742; }
.lp-nav { display:flex; align-items:center; gap:clamp(16px,2.4vw,30px); }
.lp-nav .nav-link { text-decoration:none; color:#4A5168; font-weight:600; font-size:15px; }
.lp-login-btn { text-decoration:none; color:#1C2742; font-weight:700; font-size:15px; padding:9px 18px; border-radius:999px; border:1.5px solid #DAC9A4; }

/* hero */
.lp-hero { position:relative; background:radial-gradient(120% 90% at 80% 0%,#FBF3E2 0%,#F4ECDC 45%,#EFE4CE 100%); overflow:hidden; }
.lp-coin { position:absolute; border-radius:50%; filter:drop-shadow(0 10px 18px rgba(200,134,28,.3)); }
.lp-spark { position:absolute; color:#E0A02E; }
.lp-hero-in { position:relative; max-width:1180px; margin:0 auto; padding:clamp(40px,6vw,84px) clamp(18px,4vw,40px); display:grid; grid-template-columns:repeat(auto-fit,minmax(330px,1fr)); gap:clamp(32px,5vw,64px); align-items:center; }
.lp-badge { display:inline-flex; align-items:center; gap:8px; background:#FFFCF6; border:1px solid #E6DAC2; border-radius:999px; padding:7px 14px; font-size:13px; font-weight:700; color:#C07F18; letter-spacing:.2px; }
.lp-badge i { width:7px; height:7px; border-radius:50%; background:#34B27B; display:inline-block; }
.lp-h1 { margin:20px 0 0; font-size:clamp(34px,5.2vw,58px); line-height:1.05; font-weight:900; letter-spacing:-1.5px; color:#1C2742; }
.lp-h1 .grad { background:linear-gradient(180deg,#F4C95A 10%,#C8861C 90%); -webkit-background-clip:text; background-clip:text; color:transparent; }
.lp-sub { margin:22px 0 0; font-size:clamp(17px,1.6vw,20px); line-height:1.5; color:#5A6178; max-width:500px; font-weight:500; }
.lp-cta-row { margin-top:32px; display:flex; gap:14px; flex-wrap:wrap; align-items:center; }
.lp-btn-gold { text-decoration:none; display:inline-flex; align-items:center; gap:9px; color:#1C2742; font-weight:800; font-size:17px; padding:15px 26px; border-radius:999px; background:linear-gradient(180deg,#F4C95A,#DF9E2C); box-shadow:0 10px 24px rgba(200,134,28,.42); }
.lp-btn-gold img { border-radius:50%; }
.lp-btn-ghost { text-decoration:none; color:#1C2742; font-weight:700; font-size:17px; padding:15px 24px; border-radius:999px; border:1.5px solid #D6C49C; background:#FFFCF6; }
.lp-hint { margin-top:18px; display:flex; align-items:center; gap:8px; color:#8A8470; font-size:14px; font-weight:600; }
.lp-hero-art { position:relative; justify-self:center; width:100%; max-width:430px; }
.lp-poster { position:relative; border-radius:28px; overflow:hidden; box-shadow:0 30px 70px rgba(70,48,12,.28),0 4px 14px rgba(70,48,12,.12); border:6px solid #FFFCF6; transform:rotate(-1.4deg); }
.lp-poster img { display:block; width:100%; height:auto; }
.lp-chip-streak { position:absolute; top:24%; right:-6%; background:#FFFCF6; border-radius:16px; padding:10px 14px; box-shadow:0 14px 30px rgba(70,48,12,.22); font-weight:800; color:#1C2742; font-size:15px; transform:rotate(3deg); }
.lp-chip-coin { position:absolute; bottom:8%; left:-7%; background:#FFFCF6; border-radius:16px; padding:10px 14px; box-shadow:0 14px 30px rgba(70,48,12,.22); font-weight:800; color:#C07F18; font-size:15px; transform:rotate(-3deg); display:flex; align-items:center; gap:7px; }
.lp-chip-coin img { border-radius:50%; }

/* sections common */
.lp-sec-cream { background:#FFFCF6; border-top:1px solid #EAE0CB; padding:clamp(54px,7vw,96px) 0; }
.lp-sec-tan { background:#F4ECDC; padding:clamp(54px,7vw,96px) 0; }
.lp-wrap { max-width:1180px; margin:0 auto; padding:0 clamp(18px,4vw,40px); }
.lp-eyebrow { font-size:13px; font-weight:800; letter-spacing:1.5px; color:#C07F18; text-transform:uppercase; }
.lp-h2 { margin:12px 0 0; font-size:clamp(28px,3.8vw,46px); font-weight:900; letter-spacing:-1px; color:#1C2742; line-height:1.05; max-width:640px; }
.lp-lead { margin:14px 0 0; font-size:17px; color:#5A6178; max-width:540px; font-weight:500; }

/* gallery */
.lp-gal-head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; flex-wrap:wrap; }
.lp-gal-btns { display:flex; gap:10px; }
.lp-gal-btn { width:48px; height:48px; border-radius:50%; border:1.5px solid #D6C49C; background:#FFFCF6; color:#1C2742; font-size:20px; cursor:pointer; font-weight:700; }
.lp-gal-btn--gold { border:none; background:linear-gradient(180deg,#F4C95A,#DF9E2C); box-shadow:0 6px 16px rgba(200,134,28,.4); }
.lp-gal { margin-top:36px; display:flex; gap:22px; overflow-x:auto; scroll-snap-type:x mandatory; padding:6px 2px 18px; scrollbar-width:thin; }
.lp-gal-item { flex:none; width:clamp(248px,72vw,300px); scroll-snap-align:start; }
.lp-gal-card { border-radius:24px; overflow:hidden; background:#F4ECDC; box-shadow:0 18px 40px rgba(70,48,12,.16); border:1px solid #EAE0CB; }
.lp-gal-card img { display:block; width:100%; height:auto; }
.lp-gal-label { margin-top:14px; display:flex; align-items:center; gap:9px; font-weight:800; color:#1C2742; font-size:16px; }
.gallery-scroll::-webkit-scrollbar { height:8px; }
.gallery-scroll::-webkit-scrollbar-thumb { background:#D8C49A; border-radius:8px; }
.gallery-scroll::-webkit-scrollbar-track { background:transparent; }

/* problem */
.lp-prob-grid { margin-top:40px; display:grid; grid-template-columns:repeat(auto-fit,minmax(258px,1fr)); gap:22px; }
.lp-prob { position:relative; border-radius:24px; overflow:hidden; background:#FFFCF6; border:1px solid #EAE0CB; box-shadow:0 12px 30px rgba(70,48,12,.12); }
.lp-prob-img { position:relative; aspect-ratio:4/5; overflow:hidden; }
.lp-prob-img img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.lp-prob-grad { position:absolute; inset:0; background:linear-gradient(180deg,rgba(28,39,66,0) 38%,rgba(28,39,66,.18) 62%,rgba(20,28,48,.9) 100%); }
.lp-prob-cap { position:absolute; left:18px; right:18px; bottom:16px; }
.lp-tag { display:inline-block; font-size:12px; font-weight:800; letter-spacing:.4px; color:#1C2742; background:#F4C95A; border-radius:999px; padding:5px 11px; box-shadow:0 4px 12px rgba(0,0,0,.25); }
.lp-prob-cap h3 { margin:11px 0 0; font-size:21px; font-weight:900; color:#FFFCF6; line-height:1.12; letter-spacing:-.4px; text-shadow:0 2px 10px rgba(0,0,0,.4); }
.lp-prob > p { margin:0; padding:18px 20px 22px; font-size:15px; line-height:1.5; color:#5A6178; font-weight:500; }
.lp-prob-cta { margin-top:22px; background:linear-gradient(135deg,#1C2742,#26365E); border-radius:24px; padding:clamp(26px,4vw,40px); display:flex; gap:22px; align-items:center; flex-wrap:wrap; box-shadow:0 18px 44px rgba(28,39,66,.3); }
.lp-prob-cta-coin { border-radius:50%; flex:none; filter:drop-shadow(0 8px 18px rgba(200,134,28,.5)); }
.lp-prob-cta h3 { margin:0; font-size:clamp(20px,2.4vw,26px); font-weight:800; color:#FFFCF6; line-height:1.2; }
.lp-prob-cta p { margin:10px 0 0; font-size:16px; line-height:1.5; color:#C6CBDA; font-weight:500; }

/* why */
.lp-why-grid { margin-top:40px; display:grid; grid-template-columns:repeat(auto-fit,minmax(246px,1fr)); gap:20px; }
.lp-benefit { background:#F4ECDC; border:1px solid #EAE0CB; border-radius:22px; padding:26px; }
.lp-benefit-ic { width:52px; height:52px; border-radius:15px; background:linear-gradient(180deg,#F4C95A,#DF9E2C); display:flex; align-items:center; justify-content:center; font-size:26px; box-shadow:0 6px 16px rgba(200,134,28,.35); }
.lp-benefit h3 { margin:18px 0 0; font-size:19px; font-weight:800; color:#1C2742; line-height:1.2; }
.lp-benefit p { margin:10px 0 0; font-size:15px; line-height:1.5; color:#5A6178; font-weight:500; }
.lp-btags { margin-top:16px; display:flex; gap:8px; flex-wrap:wrap; }
.lp-btag { font-size:12.5px; font-weight:700; color:#C07F18; background:#FBF3E2; border:1px solid #EAD9B4; border-radius:999px; padding:5px 11px; }

/* cta */
.lp-cta-sec { background:#F4ECDC; padding:clamp(54px,7vw,100px) clamp(18px,4vw,40px); }
.lp-cta-box { position:relative; max-width:1000px; margin:0 auto; border-radius:32px; overflow:hidden; background:linear-gradient(135deg,#F4C95A 0%,#E0A02E 55%,#C8861C 100%); padding:clamp(40px,6vw,72px) clamp(26px,5vw,64px); text-align:center; box-shadow:0 28px 60px rgba(200,134,28,.4); }
.lp-cta-h2 { position:relative; margin:0; font-size:clamp(28px,4.4vw,52px); font-weight:900; letter-spacing:-1.2px; color:#1C2742; line-height:1.04; }
.lp-cta-p { position:relative; margin:16px auto 0; font-size:clamp(16px,1.8vw,19px); color:#5A3A06; max-width:520px; font-weight:600; }
.lp-cta-actions { position:relative; margin-top:30px; display:flex; gap:14px; flex-wrap:wrap; justify-content:center; }
.lp-btn-ink { text-decoration:none; display:inline-flex; align-items:center; gap:9px; color:#FFFCF6; font-weight:800; font-size:17px; padding:16px 30px; border-radius:999px; background:#1C2742; box-shadow:0 12px 26px rgba(28,39,66,.4); }

/* footer */
.lp-footer { background:#1C2742; color:#C6CBDA; padding:clamp(40px,5vw,64px) clamp(18px,4vw,40px) 36px; }
.lp-footer-in { max-width:1180px; margin:0 auto; display:flex; justify-content:space-between; gap:28px; flex-wrap:wrap; align-items:flex-start; }
.lp-footer-brand { display:flex; align-items:center; gap:10px; }
.lp-footer-brand img { border-radius:50%; }
.lp-footer-brand span { font-weight:800; font-size:22px; color:#FFFCF6; letter-spacing:-0.5px; }
.lp-footer-tag { margin:14px 0 0; font-size:15px; color:#9AA1B5; font-weight:500; }
.lp-footer-cols { display:flex; gap:clamp(36px,7vw,80px); flex-wrap:wrap; }
.lp-footer-col { display:flex; flex-direction:column; gap:11px; }
.lp-footer-h { font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#7A8199; }
.lp-footer-col a { color:#C6CBDA; text-decoration:none; font-size:15px; font-weight:500; }
.lp-footer-copy { max-width:1180px; margin:36px auto 0; padding-top:24px; border-top:1px solid rgba(255,255,255,.1); font-size:14px; color:#7A8199; }

@media (max-width:680px) {
  .nav-link { display:none !important; }
  .hero-deco { display:none !important; }
}
`;
