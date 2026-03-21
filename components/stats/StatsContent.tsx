"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatDuration, formatMonthLabel } from "@/lib/format";
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
import { HistoryDrawer } from "@/components/games/HistoryDrawer";

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 67%, 54%)",
  "hsl(190, 90%, 50%)",
  "hsl(330, 80%, 55%)",
];

export function StatsContent() {
  const [historyDrawer, setHistoryDrawer] = useState<{
    open: boolean;
    gameId?: string;
  }>({ open: false });

  const supabase = createClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, game_id, duration_seconds, score, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, score");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: games = [] } = useQuery({
    queryKey: ["games_with_details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games_with_details")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalPlaytime = sessions.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 0),
    0
  );
  const avgSessionScore =
    sessions.length > 0
      ? Number(
          (
            sessions.reduce((acc, s) => acc + (s.score ?? 0), 0) / sessions.length
          ).toFixed(1)
        )
      : 0;
  const avgReviewScore =
    reviews.length > 0
      ? Number(
          (
            reviews.reduce((acc, r) => acc + (r.score ?? 0), 0) /
            reviews.length
          ).toFixed(1)
        )
      : 0;

  const monthlyData = (() => {
    const months: Record<string, number> = {};
    sessions.forEach((s) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = (months[key] || 0) + (s.duration_seconds ?? 0);
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, seconds]) => ({
        month: formatMonthLabel(month),
        hours: Number((seconds / 3600).toFixed(1)),
      }));
  })();

  const monthlyGamesData = (() => {
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
  })();

  const genreData = (() => {
    const genreHours: Record<string, number> = {};
    sessions.forEach((s) => {
      const game = games.find((g: { id: string }) => g.id === s.game_id);
      if (game?.genre_name) {
        genreHours[game.genre_name] =
          (genreHours[game.genre_name] || 0) + (s.duration_seconds ?? 0);
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
  })();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Stats</h1>
        <p className="text-sm text-muted-foreground">
          Análise detalhada do seu gameplay.
        </p>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Tempo Total: </span>
          <span className="font-semibold tabular-nums">
            {formatDuration(totalPlaytime)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Média Sessões: </span>
          <span className="font-semibold tabular-nums text-primary">
            {avgSessionScore.toFixed(1)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Média Reviews: </span>
          <span className="font-semibold tabular-nums text-primary">
            {avgReviewScore.toFixed(1)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Total Jogos: </span>
          <span className="font-semibold tabular-nums">{games.length}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-md border border-border bg-card p-4">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Horas Jogadas por Mês
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="hours"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

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
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
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
              <div
                key={g.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                  <span className="text-muted-foreground">{g.name}</span>
                </div>
                <span className="tabular-nums font-medium">
                  {g.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Jogos por Mês
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyGamesData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="games"
                fill="hsl(142, 71%, 45%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Histórico por Jogo
        </h2>
        <div className="rounded-md border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Jogo</th>
                <th className="px-4 py-3 text-left font-medium">Gênero</th>
                <th className="px-4 py-3 text-left font-medium">Sessões</th>
                <th className="px-4 py-3 text-left font-medium">Tempo Total</th>
                <th className="px-4 py-3 text-left font-medium">Média Sessão</th>
                <th className="px-4 py-3 text-left font-medium">Review</th>
              </tr>
            </thead>
            <tbody>
              {games.map(
                (game: {
                  id: string;
                  title: string;
                  image_url: string | null;
                  genre_name: string;
                  sessions_count: number;
                  total_duration_seconds: number;
                  avg_session_score: number;
                  avg_review_score: number;
                }) => (
                  <tr
                    key={game.id}
                    className="border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-accent/50"
                    onClick={() =>
                      setHistoryDrawer({ open: true, gameId: game.id })
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-muted border border-border">
                          {game.image_url ? (
                            <img
                              src={game.image_url}
                              alt={game.title}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <span className="text-sm font-medium">
                          {game.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {game.genre_name}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                      {game.sessions_count}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                      {formatDuration(game.total_duration_seconds ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums font-medium text-primary">
                      {(game.avg_session_score ?? 0) > 0
                        ? game.avg_session_score.toFixed(1)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums font-medium">
                      {(game.avg_review_score ?? 0) > 0 ? (
                        <span className="text-primary">
                          {game.avg_review_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <HistoryDrawer
        open={historyDrawer.open}
        onOpenChange={(o) =>
          setHistoryDrawer({ ...historyDrawer, open: o })
        }
        gameId={historyDrawer.gameId}
      />
    </div>
  );
}
