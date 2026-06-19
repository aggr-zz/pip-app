/**
 * Генерация набора иконок приложения из одного источника (монета PIP).
 * store-assets/icon-source.png  ->  public/icon-*.png, apple-touch, favicon.
 *
 * Источник пришёл с ЧЁРНЫМИ углами (RGB, [0,0,0] вне скруглённой карточки).
 * Перед нарезкой перекрашиваем нейтральные тёмные пиксели (чёрный/серый кант
 * антиалиаса) в кремовый фон — БЕЗ влияния на тёплые тёмные детали монеты
 * (они не нейтральные: max-min каналов большой). Иначе у иконки чёрные уголки.
 *
 * Запуск (на сервере, где есть node_modules/sharp):
 *   node scripts/render-icons.cjs
 */
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'store-assets', 'icon-source.png');
const OUT = path.join(__dirname, '..', 'public');
const CREAM = { r: 254, g: 246, b: 229 };       // фон карточки (сэмпл из источника)
const CREAM_HEX = '#FEF6E5';

const ANY = [72, 96, 128, 144, 152, 192, 384, 512];

async function cleanedSourceBuffer() {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels; // 3
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    // тёмный И нейтральный (близкие каналы) => это чёрный/серый кант, не монета
    if (max < 95 && max - min < 30) {
      data[i] = CREAM.r; data[i + 1] = CREAM.g; data[i + 2] = CREAM.b;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: ch } }).png().toBuffer();
}

(async () => {
  const src = await cleanedSourceBuffer();
  for (const s of ANY) {
    await sharp(src).resize(s, s, { fit: 'cover' }).flatten({ background: CREAM_HEX })
      .png().toFile(path.join(OUT, `icon-${s}.png`));
  }
  for (const s of [192, 512]) {
    await sharp(src).resize(s, s, { fit: 'cover' }).flatten({ background: CREAM_HEX })
      .png().toFile(path.join(OUT, `icon-maskable-${s}.png`));
  }
  await sharp(src).resize(180, 180, { fit: 'cover' }).flatten({ background: CREAM_HEX })
    .png().toFile(path.join(OUT, 'apple-touch-icon.png'));
  await sharp(src).resize(32, 32, { fit: 'cover' }).flatten({ background: CREAM_HEX })
    .png().toFile(path.join(OUT, 'favicon-32.png'));
  console.log('icons done (cleaned corners)');
})().catch((e) => { console.error(e); process.exit(1); });
