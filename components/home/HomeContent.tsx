"use client";

import { useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { Gamepad2, Activity, Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHomeStats } from "@/hooks/use-home-stats";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

export function HomeContent() {
  const [month, setMonth] = useState<string>(String(currentMonth));
  const [year, setYear] = useState<string>(String(currentYear));

  const monthNum = month ? parseInt(month, 10) : undefined;
  const yearNum = year ? parseInt(year, 10) : undefined;

  const {
    gamesCount,
    totalSessions,
    avgReviewScore,
    avgSessionScore,
    avgSessionTimeFormatted,
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

  const activeCycles = cyclesWithDetails?.filter(
    (c: { status_name: string }) =>
      c.status_name?.toLowerCase() === "ativo" || c.status_name?.toLowerCase() === "jogando"
  ) ?? [];

  const { data: gamesMap } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("id, title, image_url");
      if (error) throw error;
      return (data ?? []).reduce(
        (acc: Record<string, { title: string; image_url: string | null }>, g: { id: string; title: string; image_url: string | null }) => {
          acc[g.id] = { title: g.title, image_url: g.image_url };
          return acc;
        },
        {}
      );
    },
  });

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ][i],
  }));
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Seu histórico de jogos, quantificado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[100px] text-sm">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[90px] text-sm">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          label="Tempo Médio/Sessão"
          value={avgSessionTimeFormatted}
          icon={Clock}
        />
      </div>

      {activeCycles.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ciclos Ativos
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeCycles.map((cycle: {
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
                  className="rounded-md border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {game?.image_url ? (
                        <img
                          src={game.image_url}
                          alt={game.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{game?.title}</p>
                      <p className="text-xs text-muted-foreground">{cycle.name}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 bg-primary/10 text-[10px] text-primary"
                    >
                      Ativo
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="tabular-nums">{cycle.sessions_count} sessões</span>
                    <span className="tabular-nums">
                      {formatDuration(cycle.total_duration_seconds ?? 0)}
                    </span>
                    {(cycle.avg_session_score ?? 0) > 0 && (
                      <span className="tabular-nums">⌀ {cycle.avg_session_score}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Atividade Recente
        </h2>
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-0">
            {recentSessions.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground py-4">
                Nenhuma sessão no período.
              </p>
            )}
            {recentSessions.map((session: {
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
                    <div className="h-10 w-10 overflow-hidden rounded-md bg-muted border border-border">
                      {game?.image_url ? (
                        <img
                          src={game.image_url}
                          alt={game.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{game?.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {session.note || "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-primary">
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
                        month: "short",
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
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
