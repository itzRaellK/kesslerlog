"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

interface HistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId?: string;
}

export function HistoryDrawer({
  open,
  onOpenChange,
  gameId,
}: HistoryDrawerProps) {
  const supabase = createClient();

  const { data: game } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      if (!gameId) return null;
      const { data, error } = await supabase
        .from("games")
        .select("id, title")
        .eq("id", gameId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gameId && open,
  });

  const { data: genre } = useQuery({
    queryKey: ["game_genre", gameId],
    queryFn: async () => {
      if (!gameId) return null;
      const { data: g } = await supabase
        .from("games")
        .select("genre_type_id")
        .eq("id", gameId)
        .single();
      if (!g?.genre_type_id) return null;
      const { data, error } = await supabase
        .from("genre_types")
        .select("name")
        .eq("id", g.genre_type_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gameId && open,
  });

  const { data: cyclesWithSessions = [] } = useQuery({
    queryKey: ["cycles_history", gameId],
    queryFn: async () => {
      if (!gameId) return [];
      const { data: cycles, error: ce } = await supabase
        .from("cycles_with_details")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });
      if (ce) throw ce;
      const result: Array<{
        id: string;
        name: string;
        status_name: string;
        sessions: Array<{
          id: string;
          created_at: string;
          duration_seconds: number;
          score: number;
          note: string | null;
        }>;
        review?: { score: number; text: string | null; badge_name: string };
      }> = [];
      for (const c of cycles ?? []) {
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id, created_at, duration_seconds, score, note")
          .eq("cycle_id", c.id)
          .order("created_at");
        const { data: rev } = await supabase
          .from("reviews")
          .select("score, text, review_badge_type_id")
          .eq("cycle_id", c.id)
          .maybeSingle();
        let badgeName = "";
        if (rev?.review_badge_type_id) {
          const { data: bt } = await supabase
            .from("review_badge_types")
            .select("name")
            .eq("id", rev.review_badge_type_id)
            .single();
          badgeName = bt?.name ?? "";
        }
        result.push({
          id: c.id,
          name: c.name,
          status_name: c.status_name,
          sessions: (sessions ?? []).map((s) => ({
            id: s.id,
            created_at: s.created_at,
            duration_seconds: s.duration_seconds,
            score: s.score,
            note: s.note,
          })),
          review: rev
            ? {
                score: rev.score,
                text: rev.text,
                badge_name: badgeName,
              }
            : undefined,
        });
      }
      return result;
    },
    enabled: !!gameId && open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[500px] sm:max-w-[500px] overflow-y-auto rounded-l-md"
      >
        <SheetHeader>
          <SheetTitle className="text-sm font-semibold">Histórico</SheetTitle>
          {game && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{game.title}</p>
              {genre && (
                <Badge
                  variant="secondary"
                  className="text-[10px] rounded-md"
                >
                  {genre.name}
                </Badge>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {cyclesWithSessions.map((cycle) => (
            <div key={cycle.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{cycle.name}</p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] rounded-md",
                      cycle.status_name?.toLowerCase() === "finalizado"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {cycle.status_name}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 pl-3 border-l border-border">
                {cycle.sessions.map((session) => (
                  <div key={session.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString(
                          "pt-BR"
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatDuration(session.duration_seconds)}
                        </span>
                        <span className="text-xs font-medium tabular-nums text-primary">
                          {session.score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {session.note || "—"}
                    </p>
                  </div>
                ))}
              </div>

              {cycle.review && (
                <div className="rounded-md border border-border bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Review</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] rounded-md"
                      >
                        {cycle.review.badge_name}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums text-primary">
                        {cycle.review.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cycle.review.text || "—"}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
