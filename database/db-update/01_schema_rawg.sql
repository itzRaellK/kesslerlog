-- ============================================================
-- Atualização 01 – Schema RAWG e tabelas relacionadas
-- Executar antes de 02_views_rawg.sql e 03_rls_rawg.sql
-- Idempotente: usa IF NOT EXISTS / blocos DO onde necessário.
-- ============================================================

-- ----------------------------------------------------------------
-- Colunas em public.games (API RAWG + cadastro manual)
-- ----------------------------------------------------------------
alter table public.games add column if not exists rawg_id integer;
alter table public.games add column if not exists slug text;
alter table public.games add column if not exists description text;
alter table public.games add column if not exists released date;
alter table public.games add column if not exists website text;
alter table public.games add column if not exists esrb_rating text;
alter table public.games add column if not exists metacritic smallint;
alter table public.games add column if not exists rawg_rating numeric(5, 2);
alter table public.games add column if not exists playtime_hours integer;
alter table public.games add column if not exists background_image_url text;
alter table public.games add column if not exists rawg_updated_at timestamptz;
alter table public.games add column if not exists synced_at timestamptz;
alter table public.games add column if not exists developers text[];
alter table public.games add column if not exists publishers text[];
alter table public.games add column if not exists requirements_json jsonb;
alter table public.games add column if not exists franchise_name text;
alter table public.games add column if not exists parent_rawg_id integer;
alter table public.games add column if not exists extra_metadata jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'games' and c.conname = 'games_metacritic_range'
  ) then
    alter table public.games add constraint games_metacritic_range
      check (metacritic is null or (metacritic between 0 and 100));
  end if;
end $$;

create unique index if not exists games_user_rawg_unique
  on public.games (user_id, rawg_id)
  where rawg_id is not null;

create index if not exists idx_games_rawg_id on public.games (rawg_id) where rawg_id is not null;

-- ----------------------------------------------------------------
-- genre_types: id da RAWG para casar ao importar
-- ----------------------------------------------------------------
alter table public.genre_types add column if not exists rawg_id integer;

create unique index if not exists genre_types_rawg_id_unique
  on public.genre_types (rawg_id)
  where rawg_id is not null;

-- ----------------------------------------------------------------
-- Múltiplos gêneros por jogo (mantém genre_type_id como “principal” legado)
-- ----------------------------------------------------------------
create table if not exists public.game_genres (
  game_id uuid not null references public.games(id) on delete cascade,
  genre_type_id uuid not null references public.genre_types(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, genre_type_id)
);

create index if not exists idx_game_genres_game_id on public.game_genres (game_id);
create index if not exists idx_game_genres_genre_type_id on public.game_genres (genre_type_id);

-- Backfill: copiar gênero único legado para a tabela de junção
insert into public.game_genres (game_id, genre_type_id)
select g.id, g.genre_type_id
from public.games g
where g.genre_type_id is not null
on conflict (game_id, genre_type_id) do nothing;

-- ----------------------------------------------------------------
-- Plataformas (dicionário global; rawg_id para upsert)
-- ----------------------------------------------------------------
create table if not exists public.platform_types (
  id uuid primary key default gen_random_uuid(),
  rawg_id integer,
  name text not null,
  slug text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_types_rawg_id_unique
  on public.platform_types (rawg_id)
  where rawg_id is not null;

create index if not exists idx_platform_types_name on public.platform_types (name);

create table if not exists public.game_platforms (
  game_id uuid not null references public.games(id) on delete cascade,
  platform_type_id uuid not null references public.platform_types(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, platform_type_id)
);

create index if not exists idx_game_platforms_game_id on public.game_platforms (game_id);
create index if not exists idx_game_platforms_platform_type_id on public.game_platforms (platform_type_id);

-- ----------------------------------------------------------------
-- Lojas / links de compra (RAWG stores)
-- ----------------------------------------------------------------
create table if not exists public.game_store_links (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  store_rawg_id integer,
  store_name text,
  url text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_store_links_game_id on public.game_store_links (game_id);

-- ----------------------------------------------------------------
-- Screenshots e vídeos (URLs)
-- ----------------------------------------------------------------
create table if not exists public.game_media (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  url text not null,
  kind text not null default 'screenshot' check (kind in ('screenshot', 'video')),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_media_game_id on public.game_media (game_id);
