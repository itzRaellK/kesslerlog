import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawgGenre } from "./types";

export type SyncRawgGenresResult = {
  inserted: number;
  linked: number;
  skipped: number;
};

/**
 * Busca GET /api/rawg/genres e alinha `public.genre_types` com os ids oficiais da RAWG:
 * - já existe `rawg_id` → ignora;
 * - linha sem `rawg_id` com mesmo nome (case-insensitive) → `update rawg_id`;
 * - senão → `insert` com `rawg_id` (política `genre_types_insert_rawg`).
 */
export async function syncRawgGenresToSupabase(
  supabase: SupabaseClient,
): Promise<SyncRawgGenresResult> {
  const r = await fetch("/api/rawg/genres", { cache: "no-store" });
  const j = (await r.json()) as {
    error?: string;
    results?: RawgGenre[];
  };
  if (!r.ok) {
    throw new Error(j.error ?? "Falha ao buscar gêneros na RAWG.");
  }

  const results = j.results ?? [];
  const { data: rows, error: fetchErr } = await supabase
    .from("genre_types")
    .select("id, name, rawg_id");
  if (fetchErr) throw fetchErr;

  const byRawgId = new Map<number, string>();
  const unlinked: { id: string; name: string }[] = [];
  for (const row of rows ?? []) {
    if (row.rawg_id != null) byRawgId.set(row.rawg_id, row.id);
    else unlinked.push({ id: row.id, name: row.name });
  }

  let inserted = 0;
  let linked = 0;
  let skipped = 0;

  for (const g of results) {
    if (byRawgId.has(g.id)) {
      skipped += 1;
      continue;
    }
    const nameLower = g.name.trim().toLowerCase();
    const hitIdx = unlinked.findIndex(
      (u) => u.name.trim().toLowerCase() === nameLower,
    );
    if (hitIdx >= 0) {
      const hit = unlinked[hitIdx];
      const { error } = await supabase
        .from("genre_types")
        .update({ rawg_id: g.id })
        .eq("id", hit.id);
      if (!error) {
        linked += 1;
        unlinked.splice(hitIdx, 1);
        byRawgId.set(g.id, hit.id);
      }
    } else {
      const { error } = await supabase.from("genre_types").insert({
        name: g.name.trim(),
        rawg_id: g.id,
        active: true,
      });
      if (!error) inserted += 1;
    }
  }

  return { inserted, linked, skipped };
}
