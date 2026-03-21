"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/format";

export function useHomeStats(month?: number, year?: number) {
  const supabase = createClient();

  const { data: gamesWithDetails, isLoading: gamesLoading } = useQuery({
    queryKey: ["games_with_details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games_with_details")
        .select("id, game_status_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const gamesPlayed = (gamesWithDetails ?? []).filter(
    (g: { game_status_name?: string }) =>
      g.game_status_name?.toLowerCase() !== "não iniciado"
  );

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions", month, year],
    queryFn: async () => {
      let q = supabase.from("sessions").select("id, game_id, duration_seconds, note, score, created_at");
      if (month != null && year != null) {
        const start = new Date(year, month - 1, 1).toISOString();
        const end = new Date(year, month, 0, 23, 59, 59).toISOString();
        q = q.gte("created_at", start).lte("created_at", end);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["reviews", month, year],
    queryFn: async () => {
      let q = supabase.from("reviews").select("id, score, created_at");
      if (month != null && year != null) {
        const start = new Date(year, month - 1, 1).toISOString();
        const end = new Date(year, month, 0, 23, 59, 59).toISOString();
        q = q.gte("created_at", start).lte("created_at", end);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalSessions = sessions?.length ?? 0;
  const totalPlaytime = sessions?.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0) ?? 0;
  const avgSessionTime = totalSessions > 0 ? Math.floor(totalPlaytime / totalSessions) : 0;
  const avgSessionScore =
    sessions?.length && sessions.length > 0
      ? Number(
          (
            sessions.reduce((acc, s) => acc + (s.score ?? 0), 0) / sessions.length
          ).toFixed(1)
        )
      : 0;
  const avgReviewScore =
    reviews?.length && reviews.length > 0
      ? Number(
          (
            reviews.reduce((acc, r) => acc + (r.score ?? 0), 0) / reviews.length
          ).toFixed(1)
        )
      : 0;

  return {
    gamesCount: gamesPlayed.length,
    totalSessions,
    avgReviewScore,
    avgSessionScore,
    avgSessionTimeFormatted: formatDuration(avgSessionTime),
    recentSessions: sessions
      ? [...sessions].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 5)
      : [],
    isLoading: gamesLoading || sessionsLoading || reviewsLoading,
  };
}
