import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import {
  sessions,
  reviews,
  getGameById,
  getBadgeById,
  formatDuration,
} from "@/data/mock";

type TimelineEntry = {
  type: "session" | "review";
  id: string;
  game_id: string;
  score: number;
  text: string;
  created_at: string;
  duration_seconds?: number;
  badge_id?: string;
};

export default function Sessions() {
  const allEntries: TimelineEntry[] = [
    ...sessions.map((s) => ({
      type: "session" as const,
      id: s.id,
      game_id: s.game_id,
      score: s.score,
      text: s.note,
      created_at: s.created_at,
      duration_seconds: s.duration_seconds,
    })),
    ...reviews.map((r) => ({
      type: "review" as const,
      id: r.id,
      game_id: r.game_id,
      score: r.score,
      text: r.text,
      created_at: r.created_at,
      badge_id: r.badge_id,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold">Sessões & Reviews</h1>
          <p className="text-sm text-muted-foreground">Histórico completo de sessões e reviews.</p>
        </div>

        <div className="space-y-2">
          {allEntries.map((entry) => {
            const game = getGameById(entry.game_id);
            const date = new Date(entry.created_at);
            const badge = entry.badge_id ? getBadgeById(entry.badge_id) : null;

            return (
              <div
                key={`${entry.type}-${entry.id}`}
                className="flex items-start gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:bg-accent/30"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface border border-border">
                  {game?.image_url && (
                    <img src={game.image_url} alt={game.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{game?.title}</p>
                    <Badge
                      variant="secondary"
                      className={
                        entry.type === "review"
                          ? "bg-warning/10 text-warning text-[10px]"
                          : "text-[10px]"
                      }
                    >
                      {entry.type === "session" ? "Sessão" : "Review"}
                    </Badge>
                    {badge && (
                      <Badge variant="secondary" className="text-[10px]">
                        {badge.name}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {entry.text}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-primary">{entry.score.toFixed(1)}</p>
                  {entry.duration_seconds && (
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      {formatDuration(entry.duration_seconds)}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
