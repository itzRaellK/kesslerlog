"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type LifetimeStatsRow = {
  avgSessionScore: number;
  avgReviewScore: number;
};

export type LifetimeStatsMap = Record<string, LifetimeStatsRow>;

/** Médias globais (todo o histórico) por jogo: score de sessões (>0) e reviews. */
export function useLifetimeGameStatsMap(enabled = true) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["lifetime_game_stats_map"],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<LifetimeStatsMap> => {
      const [sessRes, revRes] = await Promise.all([
        supabase.from("sessions").select("game_id, score"),
        supabase.from("reviews").select("game_id, score"),
      ]);
      if (sessRes.error) throw sessRes.error;
      if (revRes.error) throw revRes.error;

      const sessAgg: Record<
        string,
        { sum: number; n: number }
      > = {};
      for (const r of sessRes.data ?? []) {
        const gid = (r as { game_id: string }).game_id;
        const sc = Number((r as { score?: number | null }).score ?? 0);
        if (sc <= 0) continue;
        if (!sessAgg[gid]) sessAgg[gid] = { sum: 0, n: 0 };
        sessAgg[gid].sum += sc;
        sessAgg[gid].n += 1;
      }

      const revAgg: Record<string, { sum: number; n: number }> = {};
      for (const r of revRes.data ?? []) {
        const gid = (r as { game_id: string }).game_id;
        const sc = Number((r as { score?: number | null }).score ?? 0);
        if (!revAgg[gid]) revAgg[gid] = { sum: 0, n: 0 };
        revAgg[gid].sum += sc;
        revAgg[gid].n += 1;
      }

      const gameIds = new Set([
        ...Object.keys(sessAgg),
        ...Object.keys(revAgg),
      ]);

      const out: LifetimeStatsMap = {};
      for (const id of gameIds) {
        const s = sessAgg[id];
        const rv = revAgg[id];
        out[id] = {
          avgSessionScore: s && s.n > 0 ? Number((s.sum / s.n).toFixed(2)) : 0,
          avgReviewScore: rv && rv.n > 0 ? Number((rv.sum / rv.n).toFixed(2)) : 0,
        };
      }
      return out;
    },
  });
}
