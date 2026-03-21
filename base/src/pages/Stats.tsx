import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  sessions,
  games,
  reviews,
  genres,
  getGameById,
  getGenreById,
  getSessionsByGameId,
  formatDuration,
  getTotalDuration,
  getAverageScore,
} from "@/data/mock";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { HistoryDrawer } from "@/components/HistoryDrawer";

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 67%, 54%)",
  "hsl(190, 90%, 50%)",
  "hsl(330, 80%, 55%)",
];

export default function Stats() {
  const [historyDrawer, setHistoryDrawer] = useState<{ open: boolean; gameId?: string }>({ open: false });

  // Monthly hours data
  const monthlyData = getMonthlyHoursData();
  const monthlyGamesData = getMonthlyGamesData();
  const genreData = getGenreDistribution();
  const totalPlaytime = getTotalDuration(sessions);
  const avgSessionScore = getAverageScore(sessions);
  const avgReviewScore = getAverageScore(reviews);

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-lg font-semibold">Stats</h1>
          <p className="text-sm text-muted-foreground">Análise detalhada do seu gameplay.</p>
        </div>

        {/* Summary */}
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Tempo Total: </span>
            <span className="font-semibold tabular-nums">{formatDuration(totalPlaytime)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Média Sessões: </span>
            <span className="font-semibold tabular-nums text-primary">{avgSessionScore.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Média Reviews: </span>
            <span className="font-semibold tabular-nums text-primary">{avgReviewScore.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Jogos: </span>
            <span className="font-semibold tabular-nums">{games.length}</span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Hours per month */}
          <div className="lg:col-span-8 rounded-md border border-border bg-card p-4">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Horas Jogadas por Mês
            </h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Genre distribution */}
          <div className="lg:col-span-4 rounded-md border border-border bg-card p-4">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Gêneros (por horas)
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genreData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="hours"
                    nameKey="name"
                  >
                    {genreData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}h`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {genreData.map((g, i) => (
                <div key={g.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{g.name}</span>
                  </div>
                  <span className="tabular-nums font-medium">{g.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Games per month */}
        <div className="rounded-md border border-border bg-card p-4">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Jogos por Mês
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyGamesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="games" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Game History Table */}
        <section>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Histórico por Jogo
          </h2>
          <div className="rounded-md border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Jogo</th>
                  <th className="px-4 py-3 text-left font-medium">Gênero</th>
                  <th className="px-4 py-3 text-left font-medium">Sessões</th>
                  <th className="px-4 py-3 text-left font-medium">Tempo Total</th>
                  <th className="px-4 py-3 text-left font-medium">Média Sessão</th>
                  <th className="px-4 py-3 text-left font-medium">Review</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => {
                  const genre = getGenreById(game.genre_id);
                  const gameSessions = getSessionsByGameId(game.id);
                  const totalTime = getTotalDuration(gameSessions);
                  const avgScore = getAverageScore(gameSessions);
                  const gameReviews = reviews.filter((r) => r.game_id === game.id);
                  const reviewScore = gameReviews.length > 0 ? getAverageScore(gameReviews) : null;

                  return (
                    <tr
                      key={game.id}
                      className="border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-accent/50"
                      onClick={() => setHistoryDrawer({ open: true, gameId: game.id })}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-surface border border-border">
                            <img src={game.image_url} alt={game.title} className="h-full w-full object-cover" />
                          </div>
                          <span className="text-sm font-medium">{game.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{genre?.name}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{gameSessions.length}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{formatDuration(totalTime)}</td>
                      <td className="px-4 py-3 text-sm tabular-nums font-medium text-primary">{avgScore > 0 ? avgScore.toFixed(1) : "—"}</td>
                      <td className="px-4 py-3 text-sm tabular-nums font-medium">{reviewScore ? <span className="text-primary">{reviewScore.toFixed(1)}</span> : <span className="text-muted-foreground">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <HistoryDrawer
        open={historyDrawer.open}
        onOpenChange={(o) => setHistoryDrawer({ ...historyDrawer, open: o })}
        gameId={historyDrawer.gameId}
      />
    </Layout>
  );
}

// Helper functions for chart data
function getMonthlyHoursData() {
  const months: Record<string, number> = {};
  sessions.forEach((s) => {
    const d = new Date(s.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = (months[key] || 0) + s.duration_seconds;
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, seconds]) => ({
      month: formatMonthLabel(month),
      hours: Number((seconds / 3600).toFixed(1)),
    }));
}

function getMonthlyGamesData() {
  const months: Record<string, Set<string>> = {};
  sessions.forEach((s) => {
    const d = new Date(s.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!months[key]) months[key] = new Set();
    months[key].add(s.game_id);
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, gameSet]) => ({
      month: formatMonthLabel(month),
      games: gameSet.size,
    }));
}

function getGenreDistribution() {
  const genreHours: Record<string, number> = {};
  sessions.forEach((s) => {
    const game = getGameById(s.game_id);
    if (game) {
      const genre = getGenreById(game.genre_id);
      if (genre) {
        genreHours[genre.name] = (genreHours[genre.name] || 0) + s.duration_seconds;
      }
    }
  });
  const total = Object.values(genreHours).reduce((a, b) => a + b, 0);
  return Object.entries(genreHours)
    .sort(([, a], [, b]) => b - a)
    .map(([name, seconds]) => ({
      name,
      hours: Number((seconds / 3600).toFixed(1)),
      percentage: Number(((seconds / total) * 100).toFixed(0)),
    }));
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}
