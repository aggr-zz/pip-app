-- ─────────────────────────────────────────────────────────────────────────────
-- 018 · reward_goals — «Копилка мечты» для ребёнка
--
-- Ребёнок выбирает одну награду как цель накопления.
-- Одна активная цель на ребёнка (UNIQUE child_id).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.reward_goals (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  reward_id   uuid        NOT NULL REFERENCES public.rewards(id)   ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT reward_goals_child_id_key UNIQUE (child_id)
);

ALTER TABLE public.reward_goals ENABLE ROW LEVEL SECURITY;

-- Родитель видит цели детей своей семьи
CREATE POLICY "parent can read family goals"
  ON public.reward_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles child
      JOIN public.profiles parent ON parent.family_id = child.family_id
      WHERE child.id    = reward_goals.child_id
        AND parent.user_id = auth.uid()
        AND parent.role    = 'parent'
    )
  );

-- Запись / обновление / удаление — только через admin-client (server actions),
-- обходя RLS (service role). Прямых пользовательских write-политик нет намеренно.
