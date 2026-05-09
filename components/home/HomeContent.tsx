"use client";

import { useMemo, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { Gamepad2, Activity, Clock, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useHomeStats } from "@/hooks/use-home-stats";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  formatDuration,
  formatNumericScore,
  parseNumericScore,
} from "@/lib/format";
import { AutocompleteFilterInput } from "@/components/AutocompleteFilterInput";
import {
  FILTER_MONTH_ALL_LABEL,
  homeMonthSuggestItems,
  resolveMonthFilter,
  resolveYearFilter,
  yearSuggestItems,
} from "@/lib/period-filter";

const currentDate = new Date();
const currentYear = currentDate.getFullYear();

export function HomeContent() {
  const [monthText, setMonthText] = useState<string>(
    () => FILTER_MONTH_ALL_LABEL,
  );
  const [yearText, setYearText] = useState(() => String(currentYear));

  const monthSuggestItems = useMemo(() => homeMonthSuggestItems(), []);
  const yearSuggestItemsList = useMemo(() => yearSuggestItems(), []);

  const monthResolved = useMemo(
    () => resolveMonthFilter(monthText, monthSuggestItems, "all"),
    [monthText, monthSuggestItems],
  );
  const yearResolved = useMemo(
    () => resolveYearFilter(yearText, currentYear),
    [yearText],
  );

  const {
    gamesRegistered,
    gamesPlaying,
    totalCycles,
    totalSessions,
    reviewsCount,
    avgReviewScore,
    avgSessionScore,
    avgSessionTimeFormatted,
    totalSessionTimeFormatted,
    recentSessions,
    isLoading,
  } = useHomeStats(monthResolved, yearResolved);

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
    staleTime: 60_000,
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
    staleTime: 60_000,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Home</h1>
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
              onClear={() => setMonthText(FILTER_MONTH_ALL_LABEL)}
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
              suggestions={yearSuggestItemsList}
              placeholder="Digite ou escolha o ano…"
              maxVisible={12}
              onClear={() => setYearText(String(currentYear))}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Jogos"
          stats={
            isLoading
              ? [
                  { label: "Cadastrados", value: "—" },
                  { label: "Em jogo", value: "—" },
                ]
              : [
                  { label: "Cadastrados", value: String(gamesRegistered) },
                  { label: "Em jogo", value: String(gamesPlaying) },
                ]
          }
          icon={Gamepad2}
        />
        <MetricCard
          label="Ciclos"
          stats={
            isLoading
              ? [
                  { label: "Total", value: "—" },
                  { label: "Média reviews", value: "—" },
                ]
              : [
                  { label: "Total", value: String(totalCycles) },
                  {
                    label: "Média reviews",
                    value: reviewsCount > 0 ? avgReviewScore.toFixed(2) : "—",
                  },
                ]
          }
          icon={Repeat}
        />
        <MetricCard
          label="Sessões"
          stats={
            isLoading
              ? [
                  { label: "Total", value: "—" },
                  { label: "Média (sessão)", value: "—" },
                ]
              : [
                  { label: "Total", value: String(totalSessions) },
                  {
                    label: "Média (sessão)",
                    value:
                      totalSessions > 0 && avgSessionScore > 0
                        ? avgSessionScore.toFixed(2)
                        : "—",
                  },
                ]
          }
          icon={Activity}
        />
        <MetricCard
          label="Tempo total"
          stats={
            isLoading
              ? [
                  { label: "Total", value: "—" },
                  { label: "Média duração", value: "—" },
                ]
              : [
                  { label: "Total", value: totalSessionTimeFormatted },
                  {
                    label: "Média duração",
                    value: totalSessions > 0 ? avgSessionTimeFormatted : "—",
                  },
                ]
          }
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
                const avgSess = cycle.avg_session_score;
                const avgSessNum = parseNumericScore(avgSess);
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
                        <p className="truncate text-sm font-medium text-app-title">
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
                      {avgSessNum !== null && avgSessNum > 0 && (
                        <Badge
                          variant="secondary"
                          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0 text-[10px] font-medium tabular-nums text-emerald-800 dark:text-emerald-400"
                        >
                          ⌀ {formatNumericScore(avgSess, 2)}
                        </Badge>
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
                          <p className="text-sm font-medium text-app-title">
                            {game?.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-app-body">
                            {session.note || "—"}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1 text-right">
                          <Badge
                            variant="secondary"
                            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-800 dark:text-emerald-400"
                          >
                            {formatNumericScore(session.score, 2)}
                          </Badge>
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
