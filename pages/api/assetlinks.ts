import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Digital Asset Links для TWA (RuStore). Отдаётся на /.well-known/assetlinks.json
 * (rewrite в next.config.mjs).
 *
 * package_name и отпечатки берём из ENV, чтобы обновить ключ или ДОБАВИТЬ отпечаток
 * (например, ключ пере-подписи RuStore) без передеплоя кода — достаточно поменять
 * переменную и перезапустить сервис. Несколько отпечатков — через запятую.
 *
 *   TWA_PACKAGE_NAME=ru.pipup.twa
 *   TWA_SHA256_FINGERPRINTS=AA:BB:...,CC:DD:...
 *
 * Фолбэк — значения текущей сборки.
 */
const PACKAGE_NAME = process.env.TWA_PACKAGE_NAME || 'ru.pipup.twa';

const FINGERPRINTS = (
  process.env.TWA_SHA256_FINGERPRINTS ||
  'D0:F5:E7:13:6F:77:2E:A7:6A:68:EA:BC:02:4E:A7:1B:23:CE:B1:AB:31:88:66:A8:3E:5A:BE:8D:31:37:EC:02'
)
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', 'application/json');
  // 1 час — чтобы обновление отпечатка распространялось быстро.
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: FINGERPRINTS,
      },
    },
  ]);
}
