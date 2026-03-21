-- ============================================================
-- SCHEMA – Executar primeiro no Supabase (SQL Editor).
-- Cria tabelas, FKs e índices. Sem alteração de dados.
-- ============================================================

-- Tipos de gênero (tabela relacional)
create table if not exists public.genre_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tipos de status (ciclo)
create table if not exists public.status_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  "order" smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tipos de status do jogo (não iniciado, jogando, concluído, etc.)
create table if not exists public.game_status_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "order" smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tipos de badge de review
create table if not exists public.review_badge_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jogos
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  genre_type_id uuid references public.genre_types(id),
  game_status_type_id uuid references public.game_status_types(id),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notas externas (N por jogo)
create table if not exists public.game_external_scores (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  source text not null,
  score numeric(4,2) not null,
  created_at timestamptz not null default now()
);

-- Ciclos
create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status_type_id uuid not null references public.status_types(id),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Sessões
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_seconds integer not null,
  note text,
  score numeric(3,2) not null,
  created_at timestamptz not null default now()
);

-- Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric(3,2) not null,
  text text,
  review_badge_type_id uuid not null references public.review_badge_types(id),
  created_at timestamptz not null default now()
);

-- Lista de espera (fila de jogos)
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  position integer not null,
  added_at timestamptz not null default now(),
  unique(user_id, game_id)
);

-- Perfil de usuário (superadmin flag para configurações)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_games_user_id on public.games(user_id);
create index if not exists idx_games_genre_type_id on public.games(genre_type_id);
create index if not exists idx_games_game_status_type_id on public.games(game_status_type_id);
create index if not exists idx_game_external_scores_game_id on public.game_external_scores(game_id);
create index if not exists idx_cycles_game_id on public.cycles(game_id);
create index if not exists idx_cycles_user_id on public.cycles(user_id);
create index if not exists idx_cycles_status_type_id on public.cycles(status_type_id);
create index if not exists idx_sessions_cycle_id on public.sessions(cycle_id);
create index if not exists idx_sessions_game_id on public.sessions(game_id);
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_created_at on public.sessions(created_at);
create index if not exists idx_reviews_cycle_id on public.reviews(cycle_id);
create index if not exists idx_reviews_game_id on public.reviews(game_id);
create index if not exists idx_reviews_user_id on public.reviews(user_id);
create index if not exists idx_waitlist_user_id on public.waitlist(user_id);
create index if not exists idx_waitlist_position on public.waitlist(user_id, position);

-- Em bancos antigos: adicionar coluna game_status_type_id em games se não existir
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'games' and column_name = 'game_status_type_id'
  ) then
    alter table public.games add column game_status_type_id uuid references public.game_status_types(id);
    create index if not exists idx_games_game_status_type_id on public.games(game_status_type_id);
  end if;
end $$;

-- Bancos antigos: coluna display_name em profiles
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name'
  ) then
    alter table public.profiles add column display_name text;
  end if;
end $$;
