/**
 * Единый тип результата server actions.
 *
 * Было: `type Result<T = Record<string, never>>`, скопированный в 10 файлов.
 * `Record<string, never>` означает «ЛЮБОЙ строковый ключ имеет тип never»,
 * поэтому `{ ok: true } & Record<string, never>` требует, чтобы и `ok` был never —
 * из-за этого каждый `return { ok: true }` подсвечивался ошибкой TS2322.
 * Таких ошибок накопилось 14, и все они маскировались `ignoreBuildErrors: true`
 * в next.config.mjs — то есть настоящие регрессии типов уехали бы в прод так же
 * незаметно.
 *
 * Стало: `Record<never, never>` — пустой объект без ключей. Пересечение
 * `{ ok: true } & Record<never, never>` даёт ровно `{ ok: true }`.
 *
 * Использование:
 *   Result                    → { ok: true } | { ok: false; error: string }
 *   Result<{ id: string }>    → { ok: true; id: string } | { ok: false; error: string }
 */
export type Result<T = Record<never, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };
