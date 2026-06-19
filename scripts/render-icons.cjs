/**
 * Генерация набора иконок приложения из одного источника (монета PIP).
 * store-assets/icon-source.png  ->  public/icon-*.png, apple-touch, favicon.
 *
 * Запуск (на сервере, где есть node_modules/sharp):
 *   node scripts/render-icons.cjs
 */
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'store-assets', 'icon-source.png');
const OUT = path.join(__dirname, '..', 'public');
const CREAM = '#F2EDE2'; // фон под maskable (совпадает с manifest background_color)

const ANY = [72, 96, 128, 144, 152, 192, 384, 512];

(async () => {
  for (const s of ANY) {
    await sharp(SRC).resize(s, s, { fit: 'cover' }).png().toFile(path.join(OUT, `icon-${s}.png`));
  }
  // maskable — без альфы (углы залиты), чтобы лаунчер не показывал прозрачность
  for (const s of [192, 512]) {
    await sharp(SRC).resize(s, s, { fit: 'cover' }).flatten({ background: CREAM })
      .png().toFile(path.join(OUT, `icon-maskable-${s}.png`));
  }
  await sharp(SRC).resize(180, 180, { fit: 'cover' }).png().toFile(path.join(OUT, 'apple-touch-icon.png'));
  await sharp(SRC).resize(32, 32, { fit: 'cover' }).png().toFile(path.join(OUT, 'favicon-32.png'));
  console.log('icons done:', [...ANY, 'maskable-192', 'maskable-512', 'apple-touch-180', 'favicon-32'].join(', '));
})().catch((e) => { console.error(e); process.exit(1); });
