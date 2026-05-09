-- ============================================================
-- 05 – Ordem dos gêneros + gênero principal sempre derivado de game_genres
-- Evita dessincronia entre games.genre_type_id e public.game_genres.
-- Rode após 01–04. Idempotente onde possível.
-- ============================================================

-- 1) Ordem explícita (RAWG / multiselect); antes a view ordenava só por nome.
alter table public.game_genres
  add column if not exists sort_order smallint not null default 0;

update public.game_genres gg
set sort_order = sub.rn
from (
  select
    game_id,
    genre_type_id,
    (row_number() over (partition by game_id order by genre_type_id) - 1)::smallint as rn
  from public.game_genres
) sub
where gg.game_id = sub.game_id
  and gg.genre_type_id = sub.genre_type_id;

-- 2) Função: um único “principal” = primeiro sort_order, desempate por nome
create or replace function public.trg_sync_game_primary_genre()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  gid uuid;
begin
  gid := coalesce(new.game_id, old.game_id);

  update public.games g
  set genre_type_id = (
    select gg.genre_type_id
    from public.game_genres gg
    inner join public.genre_types gt
      on gt.id = gg.genre_type_id
     and gt.active = true
    where gg.game_id = gid
    order by gg.sort_order asc, gt.name asc
    limit 1
  )
  where g.id = gid;

  return coalesce(new, old);
end;
$$;

drop trigger if exists game_genres_sync_primary on public.game_genres;
create trigger game_genres_sync_primary
  after insert or update or delete on public.game_genres
  for each row
  execute function public.trg_sync_game_primary_genre();

-- 3) Alinhar linhas existentes (caso já estivessem divergentes)
update public.games g
set genre_type_id = (
  select gg2.genre_type_id
  from public.game_genres gg2
  inner join public.genre_types gt2 on gt2.id = gg2.genre_type_id and gt2.active = true
  where gg2.game_id = g.id
  order by gg2.sort_order asc, gt2.name asc
  limit 1
)
where exists (select 1 from public.game_genres gg where gg.game_id = g.id);

update public.games g
set genre_type_id = null
where not exists (select 1 from public.game_genres gg where gg.game_id = g.id)
  and g.genre_type_id is not null;

-- 4) View: listar na ordem do utilizador / RAWG, não só A–Z
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
      select string_agg(gt2.name, ', ' order by gg2.sort_order asc, gt2.name asc)
      from public.game_genres gg2
      join public.genre_types gt2 on gt2.id = gg2.genre_type_id and gt2.active = true
      where gg2.game_id = g.id
    ),
    gt.name,
    '—'
  ) as genre_names,
  coalesce(
    (
      select array_agg(gg3.genre_type_id order by gg3.sort_order asc, gt3.name asc)
      from public.game_genres gg3
      join public.genre_types gt3 on gt3.id = gg3.genre_type_id and gt3.active = true
      where gg3.game_id = g.id
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

-- 5) Permitir “prender” rawg_id em linhas seed (rawg_id nulo) — evita duplicar Action/RPG
drop policy if exists "genre_types_attach_rawg" on public.genre_types;
create policy "genre_types_attach_rawg" on public.genre_types
  for update to authenticated
  using (rawg_id is null)
  with check (rawg_id is not null);
