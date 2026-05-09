-- ============================================================
-- 07 – Metacritic 0–10 (uma casa) em vez de 0–100 da RAWG
-- Converte valores já gravados: se > 10, assume escala antiga 0–100.
-- A view games_with_details referencia g.metacritic; é recriada ao final.
-- Rode uma vez após atualizar o app.
-- ============================================================

drop view if exists public.games_with_details cascade;

alter table public.games drop constraint if exists games_metacritic_range;

alter table public.games
  alter column metacritic type numeric(4, 1)
  using (
    case
      when metacritic is null then null
      when metacritic::numeric > 10 then round(metacritic::numeric / 10, 1)
      else round(metacritic::numeric, 1)
    end
  );

alter table public.games add constraint games_metacritic_range
  check (metacritic is null or (metacritic >= 0 and metacritic <= 10));

update public.game_external_scores
set score = round(score::numeric / 10, 1)
where lower(trim(source)) = 'metacritic'
  and score > 10
  and score <= 100;

-- Mesma definição que em 02_views_rawg.sql (games_with_details)
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
      select string_agg(gt2.name, ', ' order by gg.sort_order asc, gt2.name asc)
      from public.game_genres gg
      join public.genre_types gt2 on gt2.id = gg.genre_type_id and gt2.active = true
      where gg.game_id = g.id
    ),
    gt.name,
    '—'
  ) as genre_names,
  coalesce(
    (
      select array_agg(gg.genre_type_id order by gg.sort_order asc, gt3.name asc)
      from public.game_genres gg
      join public.genre_types gt3 on gt3.id = gg.genre_type_id and gt3.active = true
      where gg.game_id = g.id
    ),
    case
      when g.genre_type_id is not null then array[g.genre_type_id]
      else null
    end
  ) as genre_type_ids,
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

grant select on public.games_with_details to authenticated;
