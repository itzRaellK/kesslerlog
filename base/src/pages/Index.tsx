import { Layout } from "@/components/Layout";
import { MetricCard } from "@/components/MetricCard";
import {
  games,
  cycles,
  sessions,
  reviews,
  queue,
  getGameById,
  getGenreById,
  getSessionsByCycleId,
  getBadgeById,
  formatDuration,
  getTotalDuration,
  getAverageScore,
} from "@/data/mock";
import { Gamepad2, Activity, Star, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Index() {
  const totalSessions = sessions.length;
  const avgReview = getAverageScore(reviews);
  const avgSessionScore = getAverageScore(sessions);
  const totalPlaytime = getTotalDuration(sessions);
  const avgSessionTime = totalSessions > 0 ? Math.floor(totalPlaytime / totalSessions) : 0;

  const activeCycles = cycles.filter((c) => c.status === "active");
  const recentSessions = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5);

  const queuedGames = queue.sort((a, b) => a.position - b.position).map((q) => getGameById(q.game_id)).filter(Boolean);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your gaming history, quantified.</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Jogos Jogados" value={String(games.length)} change="+2 este mês" changeType="positive" icon={Gamepad2} />
          <MetricCard label="Total de Sessões" value={String(totalSessions)} change="+5 este mês" changeType="positive" icon={Activity} />
          <MetricCard label="Média Reviews" value={avgReview.toFixed(1)} icon={Star} />
          <MetricCard label="Tempo Médio/Sessão" value={formatDuration(avgSessionTime)} icon={Clock} />
        </div>

        {/* Active Cycles */}
        <section>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ciclos Ativos
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeCycles.map((cycle) => {
              const game = getGameById(cycle.game_id);
              const genre = game ? getGenreById(game.genre_id) : null;
              const cycleSessions = getSessionsByCycleId(cycle.id);
              const totalTime = getTotalDuration(cycleSessions);
              const avgScore = getAverageScore(cycleSessions);

              return (
                <div key={cycle.id} className="rounded-md border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface">
                      {game?.image_url && (
                        <img src={game.image_url} alt={game.title} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{game?.title}</p>
                      <p className="text-xs text-muted-foreground">{cycle.name}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 bg-primary/10 text-[10px] text-primary">
                      Ativo
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {genre && <span>{genre.name}</span>}
                    <span className="tabular-nums">{cycleSessions.length} sessões</span>
                    <span className="tabular-nums">{formatDuration(totalTime)}</span>
                    {avgScore > 0 && <span className="tabular-nums">⌀ {avgScore}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Timeline */}
        <section>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Atividade Recente
          </h2>
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
            <div className="space-y-0">
              {recentSessions.map((session, i) => {
                const game = getGameById(session.game_id);
                const date = new Date(session.created_at);

                return (
                  <div key={session.id} className="relative flex gap-4 pb-6">
                    {/* Node */}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-surface border border-border">
                        {game?.image_url && (
                          <img src={game.image_url} alt={game.title} className="h-full w-full object-cover" />
                        )}
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{game?.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {session.note}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums text-primary">
                            {session.score.toFixed(1)}
                          </p>
                          <p className="text-[11px] tabular-nums text-muted-foreground">
                            {formatDuration(session.duration_seconds)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} • {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Queue */}
        {queuedGames.length > 0 && (
          <section>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Lista de Espera
            </h2>
            <div className="flex items-center gap-3">
              {queuedGames.map((game, i) => (
                <div key={game!.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">#{i + 1}</span>
                    <div className="h-6 w-6 overflow-hidden rounded-sm bg-surface">
                      <img src={game!.image_url} alt={game!.title} className="h-full w-full object-cover" />
                    </div>
                    <span className="text-sm font-medium">{game!.title}</span>
                  </div>
                  {i < queuedGames.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
