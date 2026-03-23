import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawgGameDetail } from "./types";
import { stripHtml } from "./strip-html";

async function ensureGenreTypeId(
  supabase: SupabaseClient,
  rawgId: number,
  name: string,
): Promise<string> {
  const { data: found } = await supabase
    .from("genre_types")
    .select("id")
    .eq("rawg_id", rawgId)
    .maybeSingle();
  if (found?.id) return found.id;
  const { data: inserted, error } = await supabase
    .from("genre_types")
    .insert({ name, rawg_id: rawgId, active: true })
    .select("id")
    .single();
  if (error) throw error;
  return inserted.id;
}

async function ensurePlatformTypeId(
  supabase: SupabaseClient,
  rawgId: number,
  name: string,
  slug: string | null | undefined,
): Promise<string> {
  const { data: found } = await supabase
    .from("platform_types")
    .select("id")
    .eq("rawg_id", rawgId)
    .maybeSingle();
  if (found?.id) return found.id;
  const { data: inserted, error } = await supabase
    .from("platform_types")
    .insert({
      rawg_id: rawgId,
      name,
      slug: slug ?? null,
      active: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return inserted.id;
}

export type ImportRawgGameInput = {
  userId: string;
  detail: RawgGameDetail;
  title: string;
  imageUrl: string | null;
  backgroundImageUrl: string | null;
  /** Texto livre; se vazio, usa description_raw da RAWG (sem HTML). */
  description: string;
  gameStatusTypeId: string | null;
  externalScores: { source: string; score: number }[];
};

export async function importRawgGameToSupabase(
  supabase: SupabaseClient,
  input: ImportRawgGameInput,
) {
  const { detail, userId } = input;
  const desc =
    input.description.trim() ||
    stripHtml(detail.description_raw ?? "") ||
    null;

  const genreIds: string[] = [];
  const seenGenre = new Set<string>();
  for (const g of detail.genres ?? []) {
    const id = await ensureGenreTypeId(supabase, g.id, g.name);
    if (!seenGenre.has(id)) {
      seenGenre.add(id);
      genreIds.push(id);
    }
  }

  const parentRawg =
    detail.parent_game?.id ?? detail.parent_games?.[0]?.id ?? null;

  const extraMetadata: Record<string, unknown> = {};
  if (detail.additions_count != null)
    extraMetadata.additions_count = detail.additions_count;
  if (detail.tags?.length)
    extraMetadata.tags = detail.tags.map((t) => ({
      id: t.id,
      name: t.name,
    }));

  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      rawg_id: detail.id,
      slug: detail.slug,
      description: desc,
      released: detail.released || null,
      website: detail.website?.trim() || null,
      esrb_rating: detail.esrb_rating?.name ?? null,
      metacritic: detail.metacritic ?? null,
      rawg_rating: detail.rating ?? null,
      playtime_hours:
        detail.playtime != null ? Math.round(detail.playtime) : null,
      background_image_url:
        input.backgroundImageUrl?.trim() ||
        detail.background_image ||
        null,
      image_url:
        input.imageUrl?.trim() ||
        detail.background_image_additional ||
        detail.background_image ||
        null,
      rawg_updated_at: detail.updated ?? null,
      synced_at: new Date().toISOString(),
      developers: (detail.developers ?? []).map((d) => d.name),
      publishers: (detail.publishers ?? []).map((d) => d.name),
      requirements_json: detail.pc_requirements ?? null,
      franchise_name: detail.franchise?.name ?? null,
      parent_rawg_id: parentRawg,
      extra_metadata: Object.keys(extraMetadata).length ? extraMetadata : null,
      genre_type_id: genreIds[0] ?? null,
      game_status_type_id: input.gameStatusTypeId,
    })
    .select("id")
    .single();

  if (gameError) throw gameError;
  const gameId = game.id;

  const genreRows = genreIds.map((genre_type_id) => ({
    game_id: gameId,
    genre_type_id,
  }));
  if (genreRows.length) {
    const { error } = await supabase.from("game_genres").insert(genreRows);
    if (error) throw error;
  }

  const seenPlat = new Set<number>();
  for (const row of detail.platforms ?? []) {
    const plat = row.platform;
    if (!plat?.id || seenPlat.has(plat.id)) continue;
    seenPlat.add(plat.id);
    const platformTypeId = await ensurePlatformTypeId(
      supabase,
      plat.id,
      plat.name,
      plat.slug,
    );
    const { error } = await supabase.from("game_platforms").insert({
      game_id: gameId,
      platform_type_id: platformTypeId,
    });
    if (error) throw error;
  }

  let sortOrder = 0;
  for (const s of detail.stores ?? []) {
    const url = (s.url_en || s.url)?.trim();
    if (!url) continue;
    const { error } = await supabase.from("game_store_links").insert({
      game_id: gameId,
      store_rawg_id: s.store?.id ?? s.id ?? null,
      store_name: s.store?.name ?? null,
      url,
      sort_order: sortOrder++,
    });
    if (error) throw error;
  }

  let mediaPos = 0;
  const shots = detail.short_screenshots?.length
    ? detail.short_screenshots
    : detail.screenshots ?? [];
  for (const shot of shots) {
    if (!shot.image) continue;
    const { error } = await supabase.from("game_media").insert({
      game_id: gameId,
      url: shot.image,
      kind: "screenshot",
      position: mediaPos++,
    });
    if (error) throw error;
  }

  for (const m of detail.movies ?? []) {
    const url =
      m.preview?.trim() ||
      m.data?.max ||
      m.data?.["480"] ||
      m.data?.["720"];
    if (!url) continue;
    const { error } = await supabase.from("game_media").insert({
      game_id: gameId,
      url,
      kind: "video",
      position: mediaPos++,
    });
    if (error) throw error;
  }

  const scores = [...input.externalScores];
  const hasMeta = scores.some(
    (s) => s.source.trim().toLowerCase() === "metacritic",
  );
  if (!hasMeta && detail.metacritic != null) {
    scores.push({ source: "Metacritic", score: detail.metacritic });
  }

  const scoreRows = scores
    .filter((s) => s.source.trim() && !Number.isNaN(s.score))
    .map((s) => ({
      game_id: gameId,
      source: s.source.trim(),
      score: s.score,
    }));

  if (scoreRows.length) {
    const { error } = await supabase
      .from("game_external_scores")
      .insert(scoreRows);
    if (error) throw error;
  }

  return { gameId };
}
