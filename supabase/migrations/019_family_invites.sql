-- ─────────────────────────────────────────────────────────────────────────────
-- 019 · family_invites — инвайт-ссылки для добавления второго родителя
--
-- Первый родитель генерирует токен → передаёт ссылку второму родителю.
-- Второй родитель открывает ссылку, входит/регистрируется и автоматически
-- попадает в ту же семью (family_id).
--
-- Один инвайт = одно использование. Срок действия 7 дней.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.family_invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid        NOT NULL REFERENCES public.families(id)  ON DELETE CASCADE,
  created_by  uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  token       text        NOT NULL,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at     timestamptz,
  used_by     uuid        REFERENCES public.profiles(id),

  CONSTRAINT family_invites_token_key UNIQUE (token)
);

CREATE INDEX family_invites_token_idx ON public.family_invites (token);
CREATE INDEX family_invites_family_idx ON public.family_invites (family_id);

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

-- Родитель может видеть инвайты своей семьи (для UI «активные ссылки»)
CREATE POLICY "parent can read own family invites"
  ON public.family_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id    = auth.uid()
        AND p.family_id  = family_invites.family_id
        AND p.role       = 'parent'
    )
  );

-- Все write-операции (INSERT / UPDATE) выполняются через admin-client
-- на сервере, минуя RLS — явных write-политик не нужно.
