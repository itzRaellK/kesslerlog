-- ============================================================
-- 06 – Gênero opcional no cadastro do jogo
-- Alinha com schema original (db-start): games.genre_type_id pode ser NULL.
-- Rode se tiver criado NOT NULL manualmente ou noutro script.
-- ============================================================

alter table public.games
  alter column genre_type_id drop not null;
