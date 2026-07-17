-- 026: фиксация родительского согласия на обработку данных ребёнка.
--
-- App Store 5.1.4 (Kids/семейные приложения) требует согласие родителя на сбор
-- данных несовершеннолетнего; Apple прямо оговаривает, что «parental gate»
-- (проверка «вы взрослый?») согласием НЕ является. Мы собираем имя, год
-- рождения, аватар и фото выполненных заданий — значит согласие обязательно.
--
-- Храним не «галочку», а факт: КТО дал согласие и КОГДА. Без этого доказать
-- наличие согласия (ревьюеру, пользователю, по запросу) нечем.
--
-- Идемпотентно. Для уже существующих детей проставляем согласие «задним числом»
-- от их родителя: профили созданы до введения явной галочки, при регистрации
-- родитель принимал условия — но помечаем это отдельным маркером, чтобы не
-- выдавать унаследованное за явное.

alter table public.profiles
  add column if not exists parental_consent_at timestamptz,
  add column if not exists parental_consent_by uuid references public.profiles(id) on delete set null,
  add column if not exists parental_consent_source text;

comment on column public.profiles.parental_consent_at is
  'Когда родитель дал согласие на обработку данных этого ребёнка (App Store 5.1.4).';
comment on column public.profiles.parental_consent_by is
  'Профиль родителя, давшего согласие.';
comment on column public.profiles.parental_consent_source is
  'explicit_checkbox — явная галочка в форме; legacy_backfill — проставлено при внедрении механизма.';

-- Бэкафилл для детей, заведённых до появления явного согласия.
do $$
declare c record; v_parent uuid;
begin
  for c in
    select id, family_id from public.profiles
    where role = 'child' and parental_consent_at is null
  loop
    select id into v_parent
    from public.profiles
    where family_id = c.family_id and role = 'parent'
    order by created_at
    limit 1;

    update public.profiles
      set parental_consent_at = now(),
          parental_consent_by = v_parent,
          parental_consent_source = 'legacy_backfill'
      where id = c.id;
  end loop;
end $$;
