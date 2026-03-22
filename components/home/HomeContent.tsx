"use client";

import { useMemo, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { Gamepad2, Activity, Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useHomeStats } from "@/hooks/use-home-stats";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/format";
import {
  AutocompleteFilterInput,
  type SuggestItem,
} from "@/components/AutocompleteFilterInput";

/** Nomes completos dos meses no filtro e nas sugestões. */
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

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

export function HomeContent() {
  const [monthText, setMonthText] = useState<string>(
    () => MONTH_NAMES_PT[currentMonth - 1],
  );
  const [yearText, setYearText] = useState(() => String(currentYear));

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

  const {
    gamesCount,
    totalSessions,
    avgReviewScore,
    avgSessionScore,
    totalSessionTimeFormatted,
    recentSessions,
    isLoading,
  } = useHomeStats(monthNum, yearNum);

  const supabase = createClient();
  const { data: cyclesWithDetails } = useQuery({
    queryKey: ["cycles_with_details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycles_with_details")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeCycles =
    cyclesWithDetails?.filter(
      (c: { status_name: string }) =>
        c.status_name?.toLowerCase() === "ativo" ||
        c.status_name?.toLowerCase() === "jogando",
    ) ?? [];

  const { data: gamesMap } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, title, image_url");
      if (error) throw error;
      return (data ?? []).reduce(
        (
          acc: Record<string, { title: string; image_url: string | null }>,
          g: { id: string; title: string; image_url: string | null },
        ) => {
          acc[g.id] = { title: g.title, image_url: g.image_url };
          return acc;
        },
        {},
      );
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Seu histórico de jogos, quantificado.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 min-w-[7.5rem]">
            <Label
              htmlFor="home-filter-month"
              className="text-xs font-medium text-muted-foreground"
            >
              Mês
            </Label>
            <AutocompleteFilterInput
              id="home-filter-month"
              value={monthText}
              onChange={setMonthText}
              suggestions={monthSuggestItems}
              placeholder="Digite ou escolha o mês…"
              maxVisible={12}
              dropdownClassName="max-h-72"
            />
          </div>
          <div className="space-y-1.5 min-w-[6rem]">
            <Label
              htmlFor="home-filter-year"
              className="text-xs font-medium text-muted-foreground"
            >
              Ano
            </Label>
            <AutocompleteFilterInput
              id="home-filter-year"
              value={yearText}
              onChange={setYearText}
              suggestions={yearSuggestItems}
              placeholder="Digite ou escolha o ano…"
              maxVisible={12}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Jogos Jogados"
          value={isLoading ? "—" : String(gamesCount)}
          icon={Gamepad2}
        />
        <MetricCard
          label="Total de Sessões"
          value={isLoading ? "—" : String(totalSessions)}
          icon={Activity}
        />
        <MetricCard
          label="Média Reviews"
          value={isLoading ? "—" : avgReviewScore.toFixed(1)}
          icon={Star}
        />
        <MetricCard
          label="Tempo total (sessões)"
          value={isLoading ? "—" : totalSessionTimeFormatted}
          icon={Clock}
        />
      </div>

      {activeCycles.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ciclos Ativos
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeCycles.map(
              (cycle: {
                id: string;
                game_id: string;
                name: string;
                status_name: string;
                sessions_count: number;
                total_duration_seconds: number;
                avg_session_score: number;
              }) => {
                const game = gamesMap?.[cycle.game_id];
                return (
                  <div
                    key={cycle.id}
                    className="rounded-xl border border-border/60 bg-card/90 space-y-3 p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-emerald-500/15 bg-muted">
                        {game?.image_url ? (
                          <img
                            src={game.image_url}
                            alt={game.title}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {game?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cycle.name}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 rounded-md border border-emerald-500/25 bg-emerald-500/10 text-[10px] text-emerald-800 dark:text-emerald-400"
                      >
                        Ativo
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {cycle.sessions_count} sessões
                      </span>
                      <span className="tabular-nums">
                        {formatDuration(cycle.total_duration_seconds ?? 0)}
                      </span>
                      {(cycle.avg_session_score ?? 0) > 0 && (
                        <span className="tabular-nums">
                          ⌀ {cycle.avg_session_score}
                        </span>
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Atividade Recente
        </h2>
        <div className="relative">
          <div className="absolute bottom-0 left-[19px] top-0 w-px bg-emerald-500/20" />
          <div className="space-y-0">
            {recentSessions.length === 0 && !isLoading && (
              <p className="py-4 text-sm text-muted-foreground">
                Nenhuma sessão no período.
              </p>
            )}
            {recentSessions.map(
              (session: {
                id: string;
                game_id: string;
                duration_seconds: number;
                note: string | null;
                score: number;
                created_at: string;
              }) => {
                const game = gamesMap?.[session.game_id];
                const date = new Date(session.created_at);
                return (
                  <div key={session.id} className="relative flex gap-4 pb-6">
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                      <div className="h-10 w-10 overflow-hidden rounded-md border border-emerald-500/20 bg-muted">
                        {game?.image_url ? (
                          <img
                            src={game.image_url}
                            alt={game.title}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{game?.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {session.note || "—"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                            {session.score?.toFixed(1)}
                          </p>
                          <p className="text-[11px] tabular-nums text-muted-foreground">
                            {formatDuration(session.duration_seconds ?? 0)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {date.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        •{" "}
                        {date.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
