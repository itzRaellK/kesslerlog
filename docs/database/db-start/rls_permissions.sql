-- ============================================================
-- RLS + PERMISSIONS – Executar após views.sql.
-- Habilita RLS e define políticas. Idempotente: drop policy se existir, depois create.
-- ============================================================

alter table public.genre_types enable row level security;
alter table public.status_types enable row level security;
alter table public.game_status_types enable row level security;
alter table public.review_badge_types enable row level security;
alter table public.games enable row level security;
alter table public.game_external_scores enable row level security;
alter table public.cycles enable row level security;
alter table public.sessions enable row level security;
alter table public.reviews enable row level security;
alter table public.waitlist enable row level security;
alter table public.profiles enable row level security;

-- Tipos de gênero
drop policy if exists "genre_types_select" on public.genre_types;
create policy "genre_types_select" on public.genre_types for select to authenticated using (true);

-- Tipos de status (ciclo)
drop policy if exists "status_types_select" on public.status_types;
create policy "status_types_select" on public.status_types for select to authenticated using (true);

-- Tipos de status do jogo
drop policy if exists "game_status_types_select" on public.game_status_types;
create policy "game_status_types_select" on public.game_status_types for select to authenticated using (true);

-- Tipos de badge
drop policy if exists "review_badge_types_select" on public.review_badge_types;
create policy "review_badge_types_select" on public.review_badge_types for select to authenticated using (true);

-- Games
drop policy if exists "games_select" on public.games;
drop policy if exists "games_insert" on public.games;
drop policy if exists "games_update" on public.games;
drop policy if exists "games_delete" on public.games;
create policy "games_select" on public.games for select to authenticated using (auth.uid() = user_id);
create policy "games_insert" on public.games for insert to authenticated with check (auth.uid() = user_id);
create policy "games_update" on public.games for update to authenticated using (auth.uid() = user_id);
create policy "games_delete" on public.games for delete to authenticated using (auth.uid() = user_id);

-- Notas externas
drop policy if exists "game_external_scores_select" on public.game_external_scores;
drop policy if exists "game_external_scores_insert" on public.game_external_scores;
drop policy if exists "game_external_scores_update" on public.game_external_scores;
drop policy if exists "game_external_scores_delete" on public.game_external_scores;
create policy "game_external_scores_select" on public.game_external_scores for select to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_external_scores_insert" on public.game_external_scores for insert to authenticated
  with check (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_external_scores_update" on public.game_external_scores for update to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_external_scores_delete" on public.game_external_scores for delete to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

-- Cycles
drop policy if exists "cycles_select" on public.cycles;
drop policy if exists "cycles_insert" on public.cycles;
drop policy if exists "cycles_update" on public.cycles;
drop policy if exists "cycles_delete" on public.cycles;
create policy "cycles_select" on public.cycles for select to authenticated using (auth.uid() = user_id);
create policy "cycles_insert" on public.cycles for insert to authenticated with check (auth.uid() = user_id);
create policy "cycles_update" on public.cycles for update to authenticated using (auth.uid() = user_id);
create policy "cycles_delete" on public.cycles for delete to authenticated using (auth.uid() = user_id);

-- Sessions
drop policy if exists "sessions_select" on public.sessions;
drop policy if exists "sessions_insert" on public.sessions;
drop policy if exists "sessions_update" on public.sessions;
drop policy if exists "sessions_delete" on public.sessions;
create policy "sessions_select" on public.sessions for select to authenticated using (auth.uid() = user_id);
create policy "sessions_insert" on public.sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "sessions_update" on public.sessions for update to authenticated using (auth.uid() = user_id);
create policy "sessions_delete" on public.sessions for delete to authenticated using (auth.uid() = user_id);

-- Reviews
drop policy if exists "reviews_select" on public.reviews;
drop policy if exists "reviews_insert" on public.reviews;
drop policy if exists "reviews_update" on public.reviews;
drop policy if exists "reviews_delete" on public.reviews;
create policy "reviews_select" on public.reviews for select to authenticated using (auth.uid() = user_id);
create policy "reviews_insert" on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "reviews_update" on public.reviews for update to authenticated using (auth.uid() = user_id);
create policy "reviews_delete" on public.reviews for delete to authenticated using (auth.uid() = user_id);

-- Waitlist
drop policy if exists "waitlist_select" on public.waitlist;
drop policy if exists "waitlist_insert" on public.waitlist;
drop policy if exists "waitlist_update" on public.waitlist;
drop policy if exists "waitlist_delete" on public.waitlist;
create policy "waitlist_select" on public.waitlist for select to authenticated using (auth.uid() = user_id);
create policy "waitlist_insert" on public.waitlist for insert to authenticated with check (auth.uid() = user_id);
create policy "waitlist_update" on public.waitlist for update to authenticated using (auth.uid() = user_id);
create policy "waitlist_delete" on public.waitlist for delete to authenticated using (auth.uid() = user_id);

-- Profiles
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (auth.uid() = id);
-- Cliente não pode criar perfil já como superadmin
create policy "profiles_insert" on public.profiles for insert to authenticated
  with check (auth.uid() = id and is_superadmin = false);
create policy "profiles_update" on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Superadmin: CRUD em tipos
drop policy if exists "genre_types_insert_superadmin" on public.genre_types;
drop policy if exists "genre_types_update_superadmin" on public.genre_types;
drop policy if exists "genre_types_delete_superadmin" on public.genre_types;
create policy "genre_types_insert_superadmin" on public.genre_types for insert to authenticated
  with check ((select is_superadmin from public.profiles where id = auth.uid()) = true);
create policy "genre_types_update_superadmin" on public.genre_types for update to authenticated
  using ((select is_superadmin from public.profiles where id = auth.uid()) = true);
create policy "genre_types_delete_superadmin" on public.genre_types for delete to authenticated
  using ((select is_superadmin from public.profiles where id = auth.uid()) = true);

drop policy if exists "status_types_insert_superadmin" on public.status_types;
drop policy if exists "status_types_update_superadmin" on public.status_types;
drop policy if exists "status_types_delete_superadmin" on public.status_types;
create policy "status_types_insert_superadmin" on public.status_types for insert to authenticated
  with check ((select is_superadmin from public.profiles where id = auth.uid()) = true);
create policy "status_types_update_superadmin" on public.status_types for update to authenticated
  using ((select is_superadmin from public.profiles where id = auth.uid()) = true);
create policy "status_types_delete_superadmin" on public.status_types for delete to authenticated
  using ((select is_superadmin from public.profiles where id = auth.uid()) = true);

drop policy if exists "game_status_types_insert_superadmin" on public.game_status_types;
drop policy if exists "game_status_types_update_superadmin" on public.game_status_types;
drop policy if exists "game_status_types_delete_superadmin" on public.game_status_types;
create policy "game_status_types_insert_superadmin" on public.game_status_types for insert to authenticated
  with check ((select is_superadmin from public.profiles where id = auth.uid()) = true);
create policy "game_status_types_update_superadmin" on public.game_status_types for update to authenticated
  using ((select is_superadmin from public.profiles where id = auth.uid()) = true);
create policy "game_status_types_delete_superadmin" on public.game_status_types for delete to authenticated
  using ((select is_superadmin from public.profiles where id = auth.uid()) = true);

drop policy if exists "review_badge_types_insert_superadmin" on public.review_badge_types;
drop policy if exists "review_badge_types_update_superadmin" on public.review_badge_types;
drop policy if exists "review_badge_types_delete_superadmin" on public.review_badge_types;
create policy "review_badge_types_insert_superadmin" on public.review_badge_types for insert to authenticated
  with check ((select is_superadmin from public.profiles where id = auth.uid()) = true);
create policy "review_badge_types_update_superadmin" on public.review_badge_types for update to authenticated
  using ((select is_superadmin from public.profiles where id = auth.uid()) = true);
create policy "review_badge_types_delete_superadmin" on public.review_badge_types for delete to authenticated
  using ((select is_superadmin from public.profiles where id = auth.uid()) = true);
