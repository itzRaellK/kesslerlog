-- ============================================================
-- Atualização 03 – RLS e políticas (após 02_views_rawg.sql)
-- ============================================================

alter table public.game_genres enable row level security;
alter table public.game_platforms enable row level security;
alter table public.game_store_links enable row level security;
alter table public.game_media enable row level security;
alter table public.platform_types enable row level security;

-- game_genres
drop policy if exists "game_genres_select" on public.game_genres;
drop policy if exists "game_genres_insert" on public.game_genres;
drop policy if exists "game_genres_update" on public.game_genres;
drop policy if exists "game_genres_delete" on public.game_genres;
create policy "game_genres_select" on public.game_genres for select to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_genres_insert" on public.game_genres for insert to authenticated
  with check (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_genres_update" on public.game_genres for update to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_genres_delete" on public.game_genres for delete to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

-- game_platforms
drop policy if exists "game_platforms_select" on public.game_platforms;
drop policy if exists "game_platforms_insert" on public.game_platforms;
drop policy if exists "game_platforms_update" on public.game_platforms;
drop policy if exists "game_platforms_delete" on public.game_platforms;
create policy "game_platforms_select" on public.game_platforms for select to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_platforms_insert" on public.game_platforms for insert to authenticated
  with check (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_platforms_update" on public.game_platforms for update to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_platforms_delete" on public.game_platforms for delete to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

-- game_store_links
drop policy if exists "game_store_links_select" on public.game_store_links;
drop policy if exists "game_store_links_insert" on public.game_store_links;
drop policy if exists "game_store_links_update" on public.game_store_links;
drop policy if exists "game_store_links_delete" on public.game_store_links;
create policy "game_store_links_select" on public.game_store_links for select to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_store_links_insert" on public.game_store_links for insert to authenticated
  with check (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_store_links_update" on public.game_store_links for update to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_store_links_delete" on public.game_store_links for delete to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

-- game_media
drop policy if exists "game_media_select" on public.game_media;
drop policy if exists "game_media_insert" on public.game_media;
drop policy if exists "game_media_update" on public.game_media;
drop policy if exists "game_media_delete" on public.game_media;
create policy "game_media_select" on public.game_media for select to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_media_insert" on public.game_media for insert to authenticated
  with check (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_media_update" on public.game_media for update to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));
create policy "game_media_delete" on public.game_media for delete to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

-- platform_types: leitura global; escrita por superadmin ou linhas vindas da RAWG (rawg_id)
drop policy if exists "platform_types_select" on public.platform_types;
drop policy if exists "platform_types_insert_rawg" on public.platform_types;
drop policy if exists "platform_types_insert_superadmin" on public.platform_types;
drop policy if exists "platform_types_update_superadmin" on public.platform_types;
drop policy if exists "platform_types_delete_superadmin" on public.platform_types;
create policy "platform_types_select" on public.platform_types for select to authenticated using (true);
create policy "platform_types_insert_rawg" on public.platform_types for insert to authenticated
  with check (rawg_id is not null);
create policy "platform_types_insert_superadmin" on public.platform_types for insert to authenticated
  with check ((select is_superadmin from public.profiles where id = auth.uid()) = true);
create policy "platform_types_update_superadmin" on public.platform_types for update to authenticated
  using ((select is_superadmin from public.profiles where id = auth.uid()) = true);
create policy "platform_types_delete_superadmin" on public.platform_types for delete to authenticated
  using ((select is_superadmin from public.profiles where id = auth.uid()) = true);

-- genre_types: permitir inserir gênero catalogado pela RAWG (rawg_id) sem ser superadmin
drop policy if exists "genre_types_insert_rawg" on public.genre_types;
create policy "genre_types_insert_rawg" on public.genre_types for insert to authenticated
  with check (rawg_id is not null);

-- Permissões de tabela (Supabase / role authenticated)
grant select, insert, update, delete on public.game_genres to authenticated;
grant select, insert, update, delete on public.game_platforms to authenticated;
grant select, insert, update, delete on public.game_store_links to authenticated;
grant select, insert, update, delete on public.game_media to authenticated;
grant select, insert, update, delete on public.platform_types to authenticated;
