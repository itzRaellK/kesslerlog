"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/format";
import { MetricCard } from "@/components/MetricCard";
import { Label } from "@/components/ui/label";
import { GameTitleAutocompleteInput } from "@/components/games/GameTitleAutocompleteInput";
import { GenreAutocompleteInput } from "@/components/games/GenreAutocompleteInput";
import {
  AutocompleteFilterInput,
  type SuggestItem,
} from "@/components/AutocompleteFilterInput";
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
import { Gamepad2, Activity, Star, Clock } from "lucide-react";

/** Barras: verde esmeralda padrão (alinhado ao tema). */
const BAR_FILL = "hsl(142 71% 45%)";

/** Gradientes de esmeralda para donuts (do mais claro ao mais escuro). */
function emeraldGradientColors(count: number): string[] {
  if (count <= 0) return [];
  if (count === 1) return ["hsl(142 65% 48%)"];
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const l = 58 - t * 24;
    const s = 58 + t * 14;
    return `hsl(142 ${Math.round(s)}% ${Math.round(l)}%)`;
  });
}

const MONTH_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

/** Nomes completos dos meses (eixo dos gráficos e filtro de mês). */
const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

const MONTH_LONG_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

const HOME_MONTH_ROWS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: MONTH_NAMES_PT[i],
}));

function homeMonthSuggestItems(): SuggestItem[] {
  return HOME_MONTH_ROWS.map((m, i) => ({
    label: m.label,
    value: m.label,
    searchExtra: `${m.value} ${String(m.value).padStart(2, "0")} ${MONTH_SHORT[i]} ${MONTH_LONG_PT[i]}`,
  }));
}

function resolveMonthNumber(
  text: string,
  items: SuggestItem[],
  fallback: number,
): number {
  const t = text.trim().toLowerCase();
  if (!t) return fallback;
  const exact = items.find(
    (s) => s.label.toLowerCase() === t || s.value.toLowerCase() === t,
  );
  if (exact) {
    const idx = HOME_MONTH_ROWS.findIndex((m) => m.label === exact.value);
    return idx >= 0 ? idx + 1 : fallback;
  }
  const filtered = items.filter(
    (s) =>
      s.label.toLowerCase().includes(t) ||
      (s.searchExtra ?? "").toLowerCase().includes(t),
  );
  if (filtered.length === 1) {
    const idx = HOME_MONTH_ROWS.findIndex((m) => m.label === filtered[0].value);
    return idx >= 0 ? idx + 1 : fallback;
  }
  return fallback;
}

function resolveYearNumber(text: string, fallback: number): number {
  const t = text.trim();
  if (!t) return fallback;
  const n = parseInt(t, 10);
  if (!Number.isNaN(n) && n >= 1990 && n <= 2100) return n;
  return fallback;
}

function inMonthYear(iso: string, month: number, year: number): boolean {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

function inYear(iso: string, year: number): boolean {
  return new Date(iso).getFullYear() === year;
}

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

type GameRow = {
  id: string;
  title: string;
  image_url: string | null;
  genre_name: string;
  genre_type_id: string | null;
};

export function StatsContent() {
  const [search, setSearch] = useState("");
  const [genreInput, setGenreInput] = useState("");
  const [genreFilterId, setGenreFilterId] = useState("");
  const [monthText, setMonthText] = useState<string>(
    () => MONTH_NAMES_PT[currentMonth - 1],
  );
  const [yearText, setYearText] = useState(() => String(currentYear));

  const [historyDrawer, setHistoryDrawer] = useState<{
    open: boolean;
    gameId?: string;
  }>({ open: false });

  const supabase = createClient();

  const monthSuggestItems = useMemo(() => homeMonthSuggestItems(), []);
  const yearSuggestItems = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 25 }, (_, i) => {
      const yr = String(y - i);
      return { label: yr, value: yr, searchExtra: yr };
    });
  }, []);

  const monthNum = useMemo(
    () => resolveMonthNumber(monthText, monthSuggestItems, currentMonth),
    [monthText, monthSuggestItems],
  );
  const yearNum = useMemo(
    () => resolveYearNumber(yearText, currentYear),
    [yearText],
  );

  const { data: sessions = [], isPending: sessionsLoading } = useQuery({
    queryKey: ["sessions_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, game_id, duration_seconds, score, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reviews = [], isPending: reviewsLoading } = useQuery({
    queryKey: ["reviews_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, score, created_at, game_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: games = [], isPending: gamesLoading } = useQuery({
    queryKey: ["games_with_details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games_with_details")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: genres = [] } = useQuery({
    queryKey: ["genre_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genre_types")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["cycles_for_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycles")
        .select("game_id, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = sessionsLoading || reviewsLoading || gamesLoading;

  const gameTitleSuggestions = useMemo(() => {
    const seen = new Set<string>();
    (games as Array<{ title?: string | null }>).forEach((g) => {
      const t = g.title?.trim();
      if (t) seen.add(t);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [games]);

  const gamesById = useMemo(() => {
    const m: Record<string, GameRow> = {};
    (games as GameRow[]).forEach((g) => {
      m[g.id] = g;
    });
    return m;
  }, [games]);

  /** Jogos que passam em busca + gênero (escopo de jogo). */
  const scopedGameIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    const genreQ = genreInput.trim().toLowerCase();
    const ids = new Set<string>();
    (games as GameRow[]).forEach((g) => {
      const title = (g.title ?? "").toLowerCase();
      if (q && !title.includes(q)) return;
      const gn = (g.genre_name ?? "").toLowerCase();
      if (genreFilterId) {
        if (g.genre_type_id !== genreFilterId) return;
      } else if (genreQ && !gn.includes(genreQ)) {
        return;
      }
      ids.add(g.id);
    });
    return ids;
  }, [games, search, genreInput, genreFilterId]);

  /** Sessões no período mês/ano + jogos do escopo. */
  const sessionsInScope = useMemo(() => {
    return sessions.filter(
      (s: { game_id: string; created_at: string }) =>
        scopedGameIds.has(s.game_id) &&
        inMonthYear(s.created_at, monthNum, yearNum),
    );
  }, [sessions, scopedGameIds, monthNum, yearNum]);

  /** Sessões no ano do filtro (para gráficos mensais), com mesmo escopo de jogos. */
  const sessionsInYearForCharts = useMemo(() => {
    return sessions.filter(
      (s: { game_id: string; created_at: string }) =>
        scopedGameIds.has(s.game_id) && inYear(s.created_at, yearNum),
    );
  }, [sessions, scopedGameIds, yearNum]);

  const totalPlaytime = useMemo(
    () =>
      sessionsInScope.reduce(
        (acc, s: { duration_seconds?: number | null }) =>
          acc + (s.duration_seconds ?? 0),
        0,
      ),
    [sessionsInScope],
  );

  const avgSessionScore = useMemo(() => {
    if (sessionsInScope.length === 0) return 0;
    return Number(
      (
        sessionsInScope.reduce(
          (acc, s: { score?: number | null }) => acc + (s.score ?? 0),
          0,
        ) / sessionsInScope.length
      ).toFixed(1),
    );
  }, [sessionsInScope]);

  const reviewsInScope = useMemo(() => {
    return reviews.filter(
      (r: { game_id: string; created_at: string }) =>
        scopedGameIds.has(r.game_id) &&
        inMonthYear(r.created_at, monthNum, yearNum),
    );
  }, [reviews, scopedGameIds, monthNum, yearNum]);

  const avgReviewScore = useMemo(() => {
    if (reviewsInScope.length === 0) return 0;
    return Number(
      (
        reviewsInScope.reduce(
          (acc, r: { score?: number | null }) => acc + (r.score ?? 0),
          0,
        ) / reviewsInScope.length
      ).toFixed(1),
    );
  }, [reviewsInScope]);

  const distinctGamesInScope = useMemo(() => {
    const set = new Set<string>();
    sessionsInScope.forEach((s: { game_id: string }) => set.add(s.game_id));
    return set.size;
  }, [sessionsInScope]);

  const monthlyHoursData = useMemo(() => {
    const secondsByMonthIdx: number[] = Array(12).fill(0);
    sessionsInYearForCharts.forEach(
      (s: { created_at: string; duration_seconds?: number | null }) => {
        const d = new Date(s.created_at);
        if (d.getFullYear() !== yearNum) return;
        const idx = d.getMonth();
        secondsByMonthIdx[idx] += s.duration_seconds ?? 0;
      },
    );
    return Array.from({ length: 12 }, (_, i) => ({
      month: MONTH_NAMES_PT[i],
      monthIndex: i,
      hours: Number((secondsByMonthIdx[i] / 3600).toFixed(1)),
      totalSeconds: secondsByMonthIdx[i],
    }));
  }, [sessionsInYearForCharts, yearNum]);

  const monthlyGamesData = useMemo(() => {
    const sets: Array<Set<string>> = Array.from(
      { length: 12 },
      () => new Set(),
    );
    sessionsInYearForCharts.forEach(
      (s: { game_id: string; created_at: string }) => {
        const d = new Date(s.created_at);
        if (d.getFullYear() !== yearNum) return;
        sets[d.getMonth()].add(s.game_id);
      },
    );
    return Array.from({ length: 12 }, (_, i) => ({
      month: MONTH_NAMES_PT[i],
      monthIndex: i,
      games: sets[i].size,
    }));
  }, [sessionsInYearForCharts, yearNum]);

  /** Por mês (0–11): jogos ordenados por nº de sessões (maior → menor). */
  const gamesRankedBySessionsPerMonth = useMemo(() => {
    const byMonth: Array<Array<{ title: string; sessions: number }>> =
      Array.from({ length: 12 }, () => []);
    for (let m = 0; m < 12; m++) {
      const agg: Record<string, number> = {};
      sessionsInYearForCharts.forEach(
        (s: { game_id: string; created_at: string }) => {
          const d = new Date(s.created_at);
          if (d.getFullYear() !== yearNum || d.getMonth() !== m) return;
          agg[s.game_id] = (agg[s.game_id] || 0) + 1;
        },
      );
      byMonth[m] = Object.entries(agg)
        .map(([id, sessions]) => ({
          title: gamesById[id]?.title ?? "—",
          sessions,
        }))
        .sort((a, b) => b.sessions - a.sessions);
    }
    return byMonth;
  }, [sessionsInYearForCharts, yearNum, gamesById]);

  /** Por mês (0–11): jogos ordenados por tempo jogado (maior → menor). */
  const gamesRankedByTimePerMonth = useMemo(() => {
    const byMonth: Array<Array<{ title: string; seconds: number }>> =
      Array.from({ length: 12 }, () => []);
    for (let m = 0; m < 12; m++) {
      const agg: Record<string, number> = {};
      sessionsInYearForCharts.forEach(
        (s: {
          game_id: string;
          created_at: string;
          duration_seconds?: number | null;
        }) => {
          const d = new Date(s.created_at);
          if (d.getFullYear() !== yearNum || d.getMonth() !== m) return;
          agg[s.game_id] = (agg[s.game_id] || 0) + (s.duration_seconds ?? 0);
        },
      );
      byMonth[m] = Object.entries(agg)
        .map(([id, seconds]) => ({
          title: gamesById[id]?.title ?? "—",
          seconds,
        }))
        .sort((a, b) => b.seconds - a.seconds);
    }
    return byMonth;
  }, [sessionsInYearForCharts, yearNum, gamesById]);

  /** Por gênero: jogos ordenados por sessões (maior → menor). */
  const gamesRankedBySessionsPerGenre = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    sessionsInScope.forEach((s: { game_id: string }) => {
      const game = gamesById[s.game_id];
      const genre = game?.genre_name?.trim();
      if (!genre || genre === "—") return;
      if (!map.has(genre)) map.set(genre, {});
      const row = map.get(genre)!;
      row[s.game_id] = (row[s.game_id] || 0) + 1;
    });
    const out: Record<string, Array<{ title: string; sessions: number }>> = {};
    map.forEach((agg, genre) => {
      out[genre] = Object.entries(agg)
        .map(([id, sessions]) => ({
          title: gamesById[id]?.title ?? "—",
          sessions,
        }))
        .sort((a, b) => b.sessions - a.sessions);
    });
    return out;
  }, [sessionsInScope, gamesById]);

  /** Por gênero: jogos ordenados por tempo (maior → menor). */
  const gamesRankedByTimePerGenre = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    sessionsInScope.forEach(
      (s: { game_id: string; duration_seconds?: number | null }) => {
        const game = gamesById[s.game_id];
        const genre = game?.genre_name?.trim();
        if (!genre || genre === "—") return;
        if (!map.has(genre)) map.set(genre, {});
        const row = map.get(genre)!;
        row[s.game_id] = (row[s.game_id] || 0) + (s.duration_seconds ?? 0);
      },
    );
    const out: Record<string, Array<{ title: string; seconds: number }>> = {};
    map.forEach((agg, genre) => {
      out[genre] = Object.entries(agg)
        .map(([id, seconds]) => ({
          title: gamesById[id]?.title ?? "—",
          seconds,
        }))
        .sort((a, b) => b.seconds - a.seconds);
    });
    return out;
  }, [sessionsInScope, gamesById]);

  const genreHoursData = useMemo(() => {
    const genreSeconds: Record<string, number> = {};
    sessionsInScope.forEach(
      (s: { game_id: string; duration_seconds?: number | null }) => {
        const game = gamesById[s.game_id];
        const name = game?.genre_name?.trim();
        if (name && name !== "—") {
          genreSeconds[name] =
            (genreSeconds[name] || 0) + (s.duration_seconds ?? 0);
        }
      },
    );
    const totalSec = Object.values(genreSeconds).reduce((a, b) => a + b, 0);
    return Object.entries(genreSeconds)
      .sort(([, a], [, b]) => b - a)
      .map(([name, seconds]) => ({
        name,
        /** Segundos para o Pie (evita fatias 0h por arredondamento). */
        value: seconds,
        hours: Number((seconds / 3600).toFixed(1)),
        percentage:
          totalSec > 0 ? Number(((seconds / totalSec) * 100).toFixed(0)) : 0,
      }));
  }, [sessionsInScope, gamesById]);

  const genreSessionsData = useMemo(() => {
    const counts: Record<string, number> = {};
    sessionsInScope.forEach((s: { game_id: string }) => {
      const game = gamesById[s.game_id];
      const name = game?.genre_name?.trim();
      if (name && name !== "—") counts[name] = (counts[name] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, n]) => ({
        name,
        sessions: n,
        percentage: total > 0 ? Number(((n / total) * 100).toFixed(0)) : 0,
      }));
  }, [sessionsInScope, gamesById]);

  const gamesWithCycles = useMemo(() => {
    const set = new Set<string>();
    cycles.forEach((c: { game_id: string }) => set.add(c.game_id));
    return set;
  }, [cycles]);

  const latestCycleAtByGame = useMemo(() => {
    const map: Record<string, number> = {};
    cycles.forEach((c: { game_id: string; created_at: string }) => {
      const t = new Date(c.created_at).getTime();
      if (!map[c.game_id] || t > map[c.game_id]) map[c.game_id] = t;
    });
    return map;
  }, [cycles]);

  const historyTableRows = useMemo(() => {
    const statsByGame: Record<
      string,
      {
        sessions: number;
        totalSeconds: number;
        scoreSum: number;
        scoreCount: number;
      }
    > = {};
    sessionsInScope.forEach(
      (s: {
        game_id: string;
        duration_seconds?: number | null;
        score?: number | null;
      }) => {
        if (!statsByGame[s.game_id]) {
          statsByGame[s.game_id] = {
            sessions: 0,
            totalSeconds: 0,
            scoreSum: 0,
            scoreCount: 0,
          };
        }
        const row = statsByGame[s.game_id];
        row.sessions += 1;
        row.totalSeconds += s.duration_seconds ?? 0;
        if ((s.score ?? 0) > 0) {
          row.scoreSum += s.score ?? 0;
          row.scoreCount += 1;
        }
      },
    );

    const rows: Array<
      GameRow & {
        sessions_count: number;
        total_duration_seconds: number;
        avg_session_score: number;
        avg_review_score: number;
      }
    > = [];

    scopedGameIds.forEach((id) => {
      if (!gamesWithCycles.has(id)) return;
      const st = statsByGame[id];
      if (!st || st.sessions === 0) return;
      const g = gamesById[id];
      if (!g) return;

      const gameReviews = reviewsInScope.filter(
        (r: { game_id: string }) => r.game_id === id,
      );
      const avgRev =
        gameReviews.length > 0
          ? gameReviews.reduce(
              (acc, r: { score?: number | null }) => acc + (r.score ?? 0),
              0,
            ) / gameReviews.length
          : 0;

      const avgSess = st.scoreCount > 0 ? st.scoreSum / st.scoreCount : 0;

      rows.push({
        ...g,
        sessions_count: st.sessions,
        total_duration_seconds: st.totalSeconds,
        avg_session_score: avgSess,
        avg_review_score: avgRev,
      });
    });

    rows.sort(
      (a, b) =>
        (latestCycleAtByGame[b.id] ?? 0) - (latestCycleAtByGame[a.id] ?? 0),
    );
    return rows;
  }, [
    sessionsInScope,
    scopedGameIds,
    gamesWithCycles,
    gamesById,
    reviewsInScope,
    latestCycleAtByGame,
  ]);

  const donutSessionsColors = useMemo(
    () => emeraldGradientColors(genreSessionsData.length),
    [genreSessionsData.length],
  );
  const donutHoursColors = useMemo(
    () => emeraldGradientColors(genreHoursData.length),
    [genreHoursData.length],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Stats</h1>
        <p className="text-sm text-muted-foreground">
          Análise detalhada do seu gameplay.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 min-w-[12rem] flex-1 max-w-xs">
          <Label
            htmlFor="stats-search-game"
            className="text-xs font-medium text-muted-foreground"
          >
            Buscar jogo
          </Label>
          <GameTitleAutocompleteInput
            inputId="stats-search-game"
            value={search}
            onChange={setSearch}
            titles={gameTitleSuggestions}
            placeholder="Digite ou escolha um título…"
          />
        </div>
        <div className="space-y-1.5 min-w-[12rem] flex-1 max-w-xs">
          <Label
            htmlFor="stats-filter-genre"
            className="text-xs font-medium text-muted-foreground"
          >
            Gênero
          </Label>
          <GenreAutocompleteInput
            inputId="stats-filter-genre"
            value={genreInput}
            onChange={setGenreInput}
            genres={genres as { id: string; name: string }[]}
            selectedId={genreFilterId}
            onIdChange={setGenreFilterId}
            placeholder="Digite ou escolha um gênero…"
          />
        </div>
        <div className="space-y-1.5 min-w-[9rem] flex-1 max-w-[11rem]">
          <Label
            htmlFor="stats-filter-month"
            className="text-xs font-medium text-muted-foreground"
          >
            Mês
          </Label>
          <AutocompleteFilterInput
            id="stats-filter-month"
            value={monthText}
            onChange={setMonthText}
            suggestions={monthSuggestItems}
            placeholder="Digite ou escolha o mês…"
            maxVisible={12}
            dropdownClassName="max-h-72"
          />
        </div>
        <div className="space-y-1.5 min-w-[6.5rem] flex-1 max-w-[8rem]">
          <Label
            htmlFor="stats-filter-year"
            className="text-xs font-medium text-muted-foreground"
          >
            Ano
          </Label>
          <AutocompleteFilterInput
            id="stats-filter-year"
            value={yearText}
            onChange={setYearText}
            suggestions={yearSuggestItems}
            placeholder="Digite ou escolha o ano…"
            maxVisible={12}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Tempo total"
          value={isLoading ? "—" : formatDuration(totalPlaytime)}
          icon={Clock}
        />
        <MetricCard
          label="Média sessões"
          value={isLoading ? "—" : avgSessionScore.toFixed(1)}
          icon={Activity}
        />
        <MetricCard
          label="Média reviews"
          value={isLoading ? "—" : avgReviewScore.toFixed(1)}
          icon={Star}
        />
        <MetricCard
          label="Jogos (no período)"
          value={isLoading ? "—" : String(distinctGamesInScope)}
          icon={Gamepad2}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Os cartões e donuts usam o mês e ano dos filtros. Os gráficos de barras
        mensais usam o ano{" "}
        <span className="font-medium tabular-nums">{yearNum}</span> com busca e
        gênero (Janeiro a Dezembro).
      </p>

      <div className="w-full rounded-xl border border-border/60 bg-card/90 p-4 shadow-sm">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Jogos distintos por mês ({yearNum})
        </h3>
        <div className="h-[280px] w-full">
          {isLoading ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Carregando…
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyGamesData}
                margin={{ top: 8, right: 8, left: 0, bottom: 28 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(142 71% 45% / 0.12)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as {
                      month: string;
                      monthIndex: number;
                      games: number;
                    };
                    const list =
                      gamesRankedBySessionsPerMonth[row.monthIndex] ?? [];
                    return (
                      <div className="max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-emerald-500/30 bg-card px-3 py-2.5 text-xs shadow-lg">
                        <p className="text-sm font-semibold text-foreground">
                          {row.month}
                        </p>
                        <p className="mt-1 leading-relaxed text-foreground">
                          Total:{" "}
                          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                            {row.games}
                          </span>{" "}
                          jogos
                        </p>

                        <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto pr-0.5">
                          {list.length === 0 ? (
                            <li className="text-muted-foreground">
                              Nenhuma sessão
                            </li>
                          ) : (
                            list.map((g) => (
                              <li
                                key={`${row.month}-${g.title}`}
                                className="flex items-start justify-between gap-2 border-b border-border/50 pb-1 last:border-0"
                              >
                                <span className="min-w-0 flex-1 leading-snug text-foreground">
                                  {g.title}
                                </span>
                                <span className="shrink-0 tabular-nums text-emerald-700 dark:text-emerald-400">
                                  {g.sessions} sess.
                                </span>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="games"
                  fill={BAR_FILL}
                  stroke="none"
                  strokeWidth={0}
                  activeBar={{ fill: BAR_FILL, stroke: "none" }}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="w-full rounded-xl border border-border/60 bg-card/90 p-4 shadow-sm">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Horas/minutos por mês ({yearNum})
        </h3>
        <div className="h-[280px] w-full">
          {isLoading ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Carregando…
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyHoursData}
                margin={{ top: 8, right: 8, left: 0, bottom: 28 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  cursor={{ fill: "hsl(142 71% 45% / 0.12)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as {
                      month: string;
                      monthIndex: number;
                      hours: number;
                      totalSeconds: number;
                    };
                    const list =
                      gamesRankedByTimePerMonth[row.monthIndex] ?? [];
                    return (
                      <div className="max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-emerald-500/30 bg-card px-3 py-2.5 text-xs shadow-lg">
                        <p className="text-sm font-semibold text-foreground">
                          {row.month}
                        </p>
                        <p className="mt-1 leading-relaxed text-foreground">
                          Total:{" "}
                          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                            {formatDuration(row.totalSeconds)}
                          </span>
                        </p>

                        <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto pr-0.5">
                          {list.length === 0 ? (
                            <li className="text-muted-foreground">
                              Nenhum tempo registrado
                            </li>
                          ) : (
                            list.map((g) => (
                              <li
                                key={`${row.month}-${g.title}`}
                                className="flex items-start justify-between gap-2 border-b border-border/50 pb-1 last:border-0"
                              >
                                <span className="min-w-0 flex-1 leading-snug text-foreground">
                                  {g.title}
                                </span>
                                <span className="shrink-0 tabular-nums text-emerald-700 dark:text-emerald-400">
                                  {formatDuration(g.seconds)}
                                </span>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="hours"
                  fill={BAR_FILL}
                  stroke="none"
                  strokeWidth={0}
                  activeBar={{ fill: BAR_FILL, stroke: "none" }}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/90 p-4 shadow-sm">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sessões por gênero (período filtrado)
          </h3>
          <div className="h-[220px]">
            {genreSessionsData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem sessões no período.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genreSessionsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="sessions"
                    nameKey="name"
                    stroke="none"
                    strokeWidth={0}
                  >
                    {genreSessionsData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={donutSessionsColors[i] ?? BAR_FILL}
                        stroke="none"
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0];
                      const genreName = String(
                        p.name ?? (p.payload as { name?: string })?.name ?? "",
                      );
                      const totalSessions = Number(p.value ?? 0);
                      const list =
                        gamesRankedBySessionsPerGenre[genreName] ?? [];
                      return (
                        <div className="max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-emerald-500/30 bg-card px-3 py-2.5 text-xs shadow-lg">
                          <p className="text-sm font-semibold text-foreground">
                            {genreName}
                          </p>
                          <p className="mt-1 leading-relaxed text-foreground">
                            Total:{" "}
                            <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                              {totalSessions}
                            </span>{" "}
                            sessões
                          </p>

                          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto pr-0.5">
                            {list.length === 0 ? (
                              <li className="text-muted-foreground">—</li>
                            ) : (
                              list.map((g) => (
                                <li
                                  key={`${genreName}-${g.title}`}
                                  className="flex items-start justify-between gap-2 border-b border-border/50 pb-1 last:border-0"
                                >
                                  <span className="min-w-0 flex-1 leading-snug text-foreground">
                                    {g.title}
                                  </span>
                                  <span className="shrink-0 tabular-nums text-emerald-700 dark:text-emerald-400">
                                    {g.sessions} sess.
                                  </span>
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {genreSessionsData.length > 0 && (
            <div className="mt-2 space-y-1">
              {genreSessionsData.map((g, i) => (
                <div
                  key={g.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: donutSessionsColors[i] ?? BAR_FILL,
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
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card/90 p-4 shadow-sm">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Horas/minutos por gênero (período filtrado)
          </h3>
          <div className="h-[220px]">
            {genreHoursData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem horas no período.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genreHoursData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                    strokeWidth={0}
                  >
                    {genreHoursData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={donutHoursColors[i] ?? BAR_FILL}
                        stroke="none"
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0];
                      const genreName = String(
                        p.name ?? (p.payload as { name?: string })?.name ?? "",
                      );
                      const totalSeconds = Number(p.value ?? 0);
                      const list = gamesRankedByTimePerGenre[genreName] ?? [];
                      return (
                        <div className="max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-emerald-500/30 bg-card px-3 py-2.5 text-xs shadow-lg">
                          <p className="text-sm font-semibold text-foreground">
                            {genreName}
                          </p>
                          <p className="mt-1 leading-relaxed text-foreground">
                            Total:{" "}
                            <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                              {formatDuration(totalSeconds)}
                            </span>
                          </p>

                          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto pr-0.5">
                            {list.length === 0 ? (
                              <li className="text-muted-foreground">—</li>
                            ) : (
                              list.map((g) => (
                                <li
                                  key={`${genreName}-${g.title}`}
                                  className="flex items-start justify-between gap-2 border-b border-border/50 pb-1 last:border-0"
                                >
                                  <span className="min-w-0 flex-1 leading-snug text-foreground">
                                    {g.title}
                                  </span>
                                  <span className="shrink-0 tabular-nums text-emerald-700 dark:text-emerald-400">
                                    {formatDuration(g.seconds)}
                                  </span>
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {genreHoursData.length > 0 && (
            <div className="mt-2 space-y-1">
              {genreHoursData.map((g, i) => (
                <div
                  key={g.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: donutHoursColors[i] ?? BAR_FILL,
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
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Histórico por jogo (com ciclo e sessões no período)
        </h2>
        {historyTableRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum jogo com ciclo e sessões no período e filtros atuais.
          </p>
        ) : (
          <div className="w-full rounded-xl border border-border/60 bg-card/90 shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Jogo</th>
                  <th className="px-4 py-3 text-center font-medium">Gênero</th>
                  <th className="px-4 py-3 text-center font-medium">Sessões</th>
                  <th className="px-4 py-3 text-center font-medium">
                    Tempo total
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    Média sessão
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Review</th>
                </tr>
              </thead>
              <tbody>
                {historyTableRows.map((game) => (
                  <tr
                    key={game.id}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-accent/50"
                    onClick={() =>
                      setHistoryDrawer({ open: true, gameId: game.id })
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-emerald-500/20 bg-muted">
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
                    <td className="px-4 py-3 text-center align-middle">
                      <span className="inline-flex items-center justify-center rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-400">
                        {game.genre_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center align-middle text-sm tabular-nums text-muted-foreground">
                      {game.sessions_count}
                    </td>
                    <td className="px-4 py-3 text-center align-middle text-sm tabular-nums text-muted-foreground">
                      {formatDuration(game.total_duration_seconds ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-center align-middle text-sm font-medium tabular-nums">
                      {game.avg_session_score > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
                          {game.avg_session_score.toFixed(1)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-middle text-sm font-medium tabular-nums">
                      {game.avg_review_score > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
                          {game.avg_review_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <HistoryDrawer
        open={historyDrawer.open}
        onOpenChange={(o) => setHistoryDrawer({ ...historyDrawer, open: o })}
        gameId={historyDrawer.gameId}
        periodMonth={monthNum}
        periodYear={yearNum}
      />
    </div>
  );
}
