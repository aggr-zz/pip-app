/**
 * Растеризация брендовых store-скриншотов SVG -> PNG (1080x1920) через sharp.
 * Источник: store-assets/screenshots/*.svg  ->  public/store/*.png
 *
 * Запуск (на сервере, где есть node_modules/sharp и шрифты DejaVu):
 *   node scripts/render-store.cjs
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'store-assets', 'screenshots');
const OUT = path.join(__dirname, '..', 'public', 'store');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.svg')).sort();
  for (const f of files) {
    const svg = fs.readFileSync(path.join(SRC, f));
    const out = path.join(OUT, f.replace(/\.svg$/, '.png'));
    await sharp(svg, { density: 96 }).png({ compressionLevel: 9 }).toFile(out);
    const { width, height, size } = await sharp(out).metadata().then((m) => ({ ...m, size: fs.statSync(out).size }));
    console.log(`${f} -> ${path.basename(out)}  ${width}x${height}  ${Math.round(size / 1024)}KB`);
  }
  console.log('done:', files.length, 'screenshots');
})().catch((e) => { console.error(e); process.exit(1); });
