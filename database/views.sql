-- ============================================================
-- VIEWS – Executar após schema.sql.
-- Views usadas pela aplicação. DROP antes de CREATE para permitir
-- alteração de colunas sem erro "cannot change name of view column".
-- ============================================================

drop view if exists public.waitlist_with_details cascade;
drop view if exists public.monthly_games_count_by_user cascade;
drop view if exists public.monthly_hours_by_user cascade;
drop view if exists public.cycles_with_details cascade;
drop view if exists public.games_with_details cascade;

-- View: jogos com gênero, status do jogo e totais (para listagens e dashboard).
create view public.games_with_details as
select
  g.id,
  g.user_id,
  g.title,
  g.image_url,
  g.created_at,
  gt.id as genre_type_id,
  coalesce(gt.name, '—') as genre_name,
  gst.id as game_status_type_id,
  coalesce(gst.name, 'Não iniciado') as game_status_name,
  (select count(*) from public.sessions s where s.game_id = g.id) as sessions_count,
  (select coalesce(sum(s.duration_seconds), 0) from public.sessions s where s.game_id = g.id) as total_duration_seconds,
  (select coalesce(avg(s.score), 0) from public.sessions s where s.game_id = g.id) as avg_session_score,
  (select coalesce(avg(r.score), 0) from public.reviews r where r.game_id = g.id) as avg_review_score
from public.games g
left join public.genre_types gt on gt.id = g.genre_type_id and gt.active = true
left join public.game_status_types gst on gst.id = g.game_status_type_id and gst.active = true;

-- View: ciclos com status e totais
create view public.cycles_with_details as
select
  c.id,
  c.game_id,
  c.user_id,
  c.name,
  c.created_at,
  c.finished_at,
  st.id as status_type_id,
  st.name as status_name,
  (select count(*) from public.sessions s where s.cycle_id = c.id) as sessions_count,
  (select coalesce(sum(s.duration_seconds), 0) from public.sessions s where s.cycle_id = c.id) as total_duration_seconds,
  (select coalesce(avg(s.score), 0) from public.sessions s where s.cycle_id = c.id) as avg_session_score
from public.cycles c
join public.status_types st on st.id = c.status_type_id
where st.active = true;

-- View: horas por mês (para gráfico)
create view public.monthly_hours_by_user as
select
  s.user_id,
  to_char(s.created_at, 'YYYY-MM') as month_key,
  sum(s.duration_seconds) as total_seconds
from public.sessions s
group by s.user_id, to_char(s.created_at, 'YYYY-MM')
order by month_key;

-- View: jogos distintos por mês (para gráfico)
create view public.monthly_games_count_by_user as
select
  s.user_id,
  to_char(s.created_at, 'YYYY-MM') as month_key,
  count(distinct s.game_id) as games_count
from public.sessions s
group by s.user_id, to_char(s.created_at, 'YYYY-MM')
order by month_key;

-- View: lista de espera com dados do jogo (para exibir na UI)
create view public.waitlist_with_details as
select
  w.id,
  w.user_id,
  w.game_id,
  w.position,
  w.added_at,
  g.title as game_title,
  g.image_url as game_image_url
from public.waitlist w
join public.games g on g.id = w.game_id;

grant select on public.games_with_details to authenticated;
grant select on public.cycles_with_details to authenticated;
grant select on public.monthly_hours_by_user to authenticated;
grant select on public.monthly_games_count_by_user to authenticated;
grant select on public.waitlist_with_details to authenticated;
