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
  '50:C4:4F:2C:EE:19:46:E9:8A:7E:16:83:CD:15:4D:ED:EA:10:C6:FE:DC:E4:50:D7:6F:AE:33:23:47:1A:6E:41'
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
