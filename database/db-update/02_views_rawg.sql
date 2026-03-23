-- ============================================================
-- Atualização 02 – Views (após 01_schema_rawg.sql)
-- Recria views que dependem de public.games.
-- ============================================================

drop view if exists public.waitlist_with_details cascade;
drop view if exists public.monthly_games_count_by_user cascade;
drop view if exists public.monthly_hours_by_user cascade;
drop view if exists public.cycles_with_details cascade;
drop view if exists public.games_with_details cascade;

create view public.games_with_details as
select
  g.id,
  g.user_id,
  g.title,
  g.image_url,
  g.created_at,
  g.rawg_id,
  g.slug,
  g.description,
  g.released,
  g.website,
  g.esrb_rating,
  g.metacritic,
  g.rawg_rating,
  g.playtime_hours,
  g.background_image_url,
  g.rawg_updated_at,
  g.synced_at,
  g.developers,
  g.publishers,
  g.requirements_json,
  g.franchise_name,
  g.parent_rawg_id,
  g.extra_metadata,
  gt.id as genre_type_id,
  coalesce(gt.name, '—') as genre_name,
  gst.id as game_status_type_id,
  coalesce(gst.name, 'Não iniciado') as game_status_name,
  coalesce(
    (
      select string_agg(gt2.name, ', ' order by gt2.name)
      from public.game_genres gg
      join public.genre_types gt2 on gt2.id = gg.genre_type_id and gt2.active = true
      where gg.game_id = g.id
    ),
    gt.name,
    '—'
  ) as genre_names,
  (
    select string_agg(pt.name, ', ' order by pt.name)
    from public.game_platforms gp
    join public.platform_types pt on pt.id = gp.platform_type_id and pt.active = true
    where gp.game_id = g.id
  ) as platform_names,
  (select count(*) from public.sessions s where s.game_id = g.id) as sessions_count,
  (select coalesce(sum(s.duration_seconds), 0) from public.sessions s where s.game_id = g.id) as total_duration_seconds,
  (select coalesce(avg(s.score), 0) from public.sessions s where s.game_id = g.id) as avg_session_score,
  (select coalesce(avg(r.score), 0) from public.reviews r where r.game_id = g.id) as avg_review_score
from public.games g
left join public.genre_types gt on gt.id = g.genre_type_id and gt.active = true
left join public.game_status_types gst on gst.id = g.game_status_type_id and gst.active = true;

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

create view public.monthly_hours_by_user as
select
  s.user_id,
  to_char(s.created_at, 'YYYY-MM') as month_key,
  sum(s.duration_seconds) as total_seconds
from public.sessions s
group by s.user_id, to_char(s.created_at, 'YYYY-MM')
order by month_key;

create view public.monthly_games_count_by_user as
select
  s.user_id,
  to_char(s.created_at, 'YYYY-MM') as month_key,
  count(distinct s.game_id) as games_count
from public.sessions s
group by s.user_id, to_char(s.created_at, 'YYYY-MM')
order by month_key;

create view public.waitlist_with_details as
select
  w.id,
  w.user_id,
  w.game_id,
  w.position,
  w.added_at,
  g.title as game_title,
  g.image_url as game_image_url,
  g.background_image_url as game_background_image_url
from public.waitlist w
join public.games g on g.id = w.game_id;

grant select on public.games_with_details to authenticated;
grant select on public.cycles_with_details to authenticated;
grant select on public.monthly_hours_by_user to authenticated;
grant select on public.monthly_games_count_by_user to authenticated;
grant select on public.waitlist_with_details to authenticated;
