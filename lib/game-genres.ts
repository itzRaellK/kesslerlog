import type { SupabaseClient } from "@supabase/supabase-js";

/** Linha em `genre_types` ou item escolhido para o jogo (mesmo formato). */
export type GenreRow = { id: string; name: string };

/** Lista de nomes a partir da view (`genre_names` ou `genre_name` legado). */
export function splitGenreNamesLabel(
  genre_names: string | null | undefined,
  genre_name: string | null | undefined,
): string[] {
  const multi = (genre_names ?? "").trim();
  if (multi && multi !== "—") {
    return multi
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const one = (genre_name ?? "").trim();
  if (one && one !== "—") return [one];
  return [];
}

/** Substitui linhas em `game_genres` e atualiza `genre_type_id` legado (primeiro da lista). */
export async function syncGameGenresForGame(
  supabase: SupabaseClient,
  gameId: string,
  genres: GenreRow[],
) {
  const { error: delErr } = await supabase
    .from("game_genres")
    .delete()
    .eq("game_id", gameId);
  if (delErr) throw delErr;

  /** Só `game_id` + `genre_type_id`: compatível sem coluna `sort_order`; com ela, o default 0 aplica-se. */
  const rows = genres.map((g) => ({
    game_id: gameId,
    genre_type_id: g.id,
  }));
  if (rows.length) {
    const { error: insErr } = await supabase.from("game_genres").insert(rows);
    if (insErr) throw insErr;
  }
  const { error: upErr } = await supabase
    .from("games")
    .update({ genre_type_id: genres[0]?.id ?? null })
    .eq("id", gameId);
  if (upErr) throw upErr;
}
