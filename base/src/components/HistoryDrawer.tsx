import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  cycles,
  sessions,
  reviews,
  getGameById,
  getGenreById,
  getSessionsByCycleId,
  getBadgeById,
  formatDuration,
  getTotalDuration,
  getAverageScore,
} from "@/data/mock";

interface HistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId?: string;
}

export function HistoryDrawer({ open, onOpenChange, gameId }: HistoryDrawerProps) {
  const game = gameId ? getGameById(gameId) : null;
  const genre = game ? getGenreById(game.genre_id) : null;
  const gameCycles = cycles.filter((c) => c.game_id === gameId);
  const gameReviews = reviews.filter((r) => r.game_id === gameId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm font-semibold">Histórico</SheetTitle>
          {game && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{game.title}</p>
              {genre && (
                <Badge variant="secondary" className="text-[10px]">{genre.name}</Badge>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {gameCycles.map((cycle) => {
            const cycleSessions = getSessionsByCycleId(cycle.id);
            const cycleReview = gameReviews.find((r) => r.cycle_id === cycle.id);
            const totalTime = getTotalDuration(cycleSessions);
            const avgScore = getAverageScore(cycleSessions);

            return (
              <div key={cycle.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{cycle.name}</p>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        cycle.status === "finished" ? "bg-positive/10 text-positive" : "bg-primary/10 text-primary"
                      )}
                    >
                      {cycle.status === "finished" ? "Finalizado" : "Ativo"}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{cycleSessions.length} sessões</span>
                  <span className="tabular-nums">{formatDuration(totalTime)}</span>
                  <span className="tabular-nums">Média: {avgScore}</span>
                </div>

                {/* Sessions */}
                <div className="space-y-2 pl-3 border-l border-border">
                  {cycleSessions.map((session) => (
                    <div key={session.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString("pt-BR")}
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
                      <p className="text-xs text-muted-foreground leading-relaxed">{session.note}</p>
                    </div>
                  ))}
                </div>

                {/* Review */}
                {cycleReview && (
                  <div className="rounded-md border border-border bg-surface p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Review</span>
                      <div className="flex items-center gap-2">
                        {getBadgeById(cycleReview.badge_id) && (
                          <Badge variant="secondary" className="text-[10px]">
                            {getBadgeById(cycleReview.badge_id)!.name}
                          </Badge>
                        )}
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          {cycleReview.score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{cycleReview.text}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
