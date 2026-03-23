-- ============================================================
-- SEED – Executar por último (após schema, views, rls_permissions, rpcs).
-- Dados iniciais: idempotente (só insere se a tabela estiver vazia).
-- ============================================================

insert into public.genre_types (name, active)
select v.name, v.active
from (values
  ('RPG', true),
  ('Action', true),
  ('Adventure', true),
  ('Platformer', true),
  ('Roguelike', true),
  ('Metroidvania', true),
  ('Strategy', true),
  ('Puzzle', true)
) as v(name, active)
where (select count(*) from public.genre_types) = 0;

insert into public.status_types (name, color, "order", active)
select v.name, v.color, v."order", v.active
from (values
  ('Jogando', 'blue', 1::smallint, true),
  ('Finalizado', 'green', 2::smallint, true),
  ('Abandonado', 'red', 3::smallint, true),
  ('Na Fila', 'yellow', 4::smallint, true),
  ('Pausado', 'orange', 5::smallint, true)
) as v(name, color, "order", active)
where (select count(*) from public.status_types) = 0;

insert into public.game_status_types (name, "order", active)
select v.name, v."order", v.active
from (values
  ('Não iniciado', 0::smallint, true),
  ('Jogando', 1::smallint, true),
  ('Concluído', 2::smallint, true),
  ('Abandonado', 3::smallint, true),
  ('Rejogando', 4::smallint, true)
) as v(name, "order", active)
where (select count(*) from public.game_status_types) = 0;

insert into public.review_badge_types (name, active)
select v.name, v.active
from (values
  ('Gostei', true),
  ('Não Gostei', true),
  ('Quero Mais', true),
  ('Obra-Prima', true),
  ('Decepcionante', true)
) as v(name, active)
where (select count(*) from public.review_badge_types) = 0;

-- Jogos existentes sem status: preencher com "Não iniciado"
update public.games
set game_status_type_id = (select id from public.game_status_types where name = 'Não iniciado' limit 1)
where game_status_type_id is null;

-- Marcar seu usuário como superadmin (substituir USER_UUID pelo id do auth.users):
-- insert into public.profiles (id, email, is_superadmin) values ('USER_UUID', 'seu@email.com', true) on conflict (id) do update set is_superadmin = true;
