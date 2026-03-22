"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DrawerGameHeader } from "@/components/games/DrawerGameHeader";
import { MetricEmeraldBlock } from "@/components/MetricEmeraldBlock";
import { DRAWER_SHEET_CONTENT_CLASS } from "@/lib/drawer-sheet";

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

type SessionRow = {
  id: string;
  cycle_id: string;
  created_at: string;
  duration_seconds: number;
  score: number;
  note: string | null;
};

type CycleRow = {
  id: string;
  name: string;
  status_name: string;
  created_at: string;
};

interface HistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId?: string;
  /** Quando definidos (ex.: filtros da página Stats), só sessões neste mês/ano. */
  periodMonth?: number;
  periodYear?: number;
}

export function HistoryDrawer({
  open,
  onOpenChange,
  gameId,
  periodMonth,
  periodYear,
}: HistoryDrawerProps) {
  const supabase = createClient();
  const [selectedCycleId, setSelectedCycleId] = useState<string>("__all__");

  const periodActive =
    periodMonth != null &&
    periodYear != null &&
    periodMonth >= 1 &&
    periodMonth <= 12;

  useEffect(() => {
    if (open) setSelectedCycleId("__all__");
  }, [open, gameId, periodMonth, periodYear]);

  const { data: game } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      if (!gameId) return null;
      const { data, error } = await supabase
        .from("games")
        .select("id, title, image_url")
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

  const { data: cycles = [] } = useQuery({
    queryKey: ["cycles_history_drawer", gameId],
    queryFn: async () => {
      if (!gameId) return [];
      const { data, error } = await supabase
        .from("cycles_with_details")
        .select("id, name, status_name, created_at")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CycleRow[];
    },
    enabled: !!gameId && open,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: [
      "history_drawer_sessions",
      gameId,
      periodMonth,
      periodYear,
      periodActive,
    ],
    queryFn: async () => {
      if (!gameId) return [];
      let q = supabase
        .from("sessions")
        .select("id, cycle_id, created_at, duration_seconds, score, note")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });
      if (periodActive) {
        const start = new Date(periodYear!, periodMonth! - 1, 1).toISOString();
        const end = new Date(
          periodYear!,
          periodMonth!,
          0,
          23,
          59,
          59,
        ).toISOString();
        q = q.gte("created_at", start).lte("created_at", end);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
    enabled: !!gameId && open,
  });

  const cycleIdsInData = useMemo(
    () => [...new Set(sessions.map((s) => s.cycle_id))],
    [sessions],
  );

  const { data: reviewsByCycleId = {} } = useQuery({
    queryKey: ["history_drawer_reviews", gameId, cycleIdsInData.join(",")],
    queryFn: async () => {
      if (!gameId || cycleIdsInData.length === 0) return {};
      const { data: revs, error } = await supabase
        .from("reviews")
        .select("cycle_id, score, text, review_badge_type_id")
        .eq("game_id", gameId)
        .in("cycle_id", cycleIdsInData);
      if (error) throw error;
      const list = revs ?? [];
      const badgeIds = [
        ...new Set(
          list
            .map((r) => r.review_badge_type_id)
            .filter(Boolean) as string[],
        ),
      ];
      let badgeNames: Record<string, string> = {};
      if (badgeIds.length > 0) {
        const { data: badges } = await supabase
          .from("review_badge_types")
          .select("id, name")
          .in("id", badgeIds);
        (badges ?? []).forEach((b: { id: string; name: string }) => {
          badgeNames[b.id] = b.name;
        });
      }
      const map: Record<
        string,
        { score: number; text: string | null; badge_name: string }
      > = {};
      for (const r of list) {
        map[r.cycle_id] = {
          score: r.score,
          text: r.text,
          badge_name: r.review_badge_type_id
            ? badgeNames[r.review_badge_type_id] ?? ""
            : "",
        };
      }
      return map;
    },
    enabled: !!gameId && open && cycleIdsInData.length > 0,
  });

  const sessionsByCycle = useMemo(() => {
    const m: Record<string, SessionRow[]> = {};
    for (const s of sessions) {
      if (!m[s.cycle_id]) m[s.cycle_id] = [];
      m[s.cycle_id].push(s);
    }
    for (const id of Object.keys(m)) {
      m[id].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return m;
  }, [sessions]);

  const cyclesOrdered = useMemo(() => {
    const withSessions = cycles.filter((c) => (sessionsByCycle[c.id]?.length ?? 0) > 0);
    return withSessions.length > 0 ? withSessions : cycles;
  }, [cycles, sessionsByCycle]);

  const cyclesToRender = useMemo(() => {
    const base =
      sessions.length > 0
        ? cyclesOrdered.filter((c) => (sessionsByCycle[c.id]?.length ?? 0) > 0)
        : cyclesOrdered;
    if (selectedCycleId === "__all__") return base;
    return base.filter((c) => c.id === selectedCycleId);
  }, [cyclesOrdered, sessionsByCycle, selectedCycleId, sessions.length]);

  const periodLabel =
    periodActive && periodMonth && periodYear
      ? `${MONTH_NAMES_PT[periodMonth - 1]} de ${periodYear}`
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={DRAWER_SHEET_CONTENT_CLASS}>
        <SheetHeader className="space-y-0 px-6 pb-4 pt-6 text-left">
          <SheetTitle className="sr-only">Histórico do jogo</SheetTitle>
          <DrawerGameHeader label="Histórico" gameName={game?.title}>
            {genre?.name ? (
              <p className="text-sm text-muted-foreground">{genre.name}</p>
            ) : null}
          </DrawerGameHeader>
        </SheetHeader>

        {periodLabel ? (
          <div className="border-b border-border bg-muted/25 px-6 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Período do filtro
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {periodLabel}
            </p>
          </div>
        ) : null}

        <div className="shrink-0 border-b border-border bg-muted/20 px-6 py-4">
          <Label
            htmlFor="history-cycle-filter"
            className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Ciclo
          </Label>
          <Select
            value={selectedCycleId}
            onValueChange={setSelectedCycleId}
          >
            <SelectTrigger
              id="history-cycle-filter"
              className="mt-2 h-auto min-h-10 w-full rounded-lg border-emerald-500/30 bg-background py-2 text-left"
            >
              <SelectValue placeholder="Escolha o ciclo" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="__all__" className="cursor-pointer">
                {periodActive
                  ? "Todos os ciclos (neste período)"
                  : "Todos os ciclos"}
              </SelectItem>
              {cyclesOrdered
                .filter((c) => (sessionsByCycle[c.id]?.length ?? 0) > 0)
                .map((c) => (
                  <SelectItem
                    key={c.id}
                    value={c.id}
                    className="cursor-pointer py-2.5"
                  >
                    <span className="line-clamp-2 font-medium leading-snug">
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {!gameId ? (
            <p className="text-sm text-muted-foreground">Nenhum jogo selecionado.</p>
          ) : sessions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-emerald-500/25 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              {periodActive
                ? "Nenhuma sessão neste jogo no mês e ano filtrados."
                : "Nenhuma sessão registrada para este jogo."}
            </p>
          ) : (
            <div className="space-y-8">
              {cyclesToRender.every(
                (c) => (sessionsByCycle[c.id]?.length ?? 0) === 0,
              ) ? (
                <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma sessão para o ciclo selecionado neste período.
                </p>
              ) : null}
              {cyclesToRender.map((cycle) => {
                const list = sessionsByCycle[cycle.id] ?? [];
                if (list.length === 0) return null;
                const totalSec = list.reduce(
                  (a, s) => a + (s.duration_seconds ?? 0),
                  0,
                );
                const scores = list.filter((s) => (s.score ?? 0) > 0);
                const avgScore =
                  scores.length > 0
                    ? scores.reduce((a, s) => a + (s.score ?? 0), 0) /
                      scores.length
                    : 0;
                const review = reviewsByCycleId[cycle.id];
                const finished =
                  cycle.status_name?.toLowerCase() === "finalizado";

                return (
                  <section
                    key={cycle.id}
                    className="rounded-xl border border-border/70 bg-card/80 shadow-sm"
                  >
                    <div className="border-b border-emerald-500/15 bg-muted/15 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold leading-snug text-foreground">
                            {cycle.name}
                          </h3>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {list.length}{" "}
                            {list.length === 1 ? "sessão" : "sessões"} no período
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "shrink-0 rounded-md border text-[10px] font-medium",
                            finished
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
                              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
                          )}
                        >
                          {cycle.status_name}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        <MetricEmeraldBlock
                          label="Tempo total"
                          valueClassName="font-mono-nums text-emerald-700 dark:text-emerald-400"
                          className="min-w-[7.5rem]"
                        >
                          {formatDuration(totalSec)}
                        </MetricEmeraldBlock>
                        <MetricEmeraldBlock
                          label="Média notas"
                          valueClassName="tabular-nums text-emerald-700 dark:text-emerald-400"
                          className="min-w-[7.5rem]"
                        >
                          {avgScore > 0 ? avgScore.toFixed(1) : "—"}
                        </MetricEmeraldBlock>
                      </div>
                    </div>

                    <ul className="space-y-3 p-4">
                      {list.map((session) => {
                        const d = new Date(session.created_at);
                        return (
                          <li
                            key={session.id}
                            className="rounded-lg border border-emerald-500/15 bg-background/60 p-3 shadow-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                              <time
                                className="text-[11px] font-medium text-muted-foreground"
                                dateTime={session.created_at}
                              >
                                {d.toLocaleDateString("pt-BR", {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}{" "}
                                ·{" "}
                                {d.toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </time>
                              <div className="flex flex-wrap items-stretch gap-2">
                                <MetricEmeraldBlock
                                  label="Gameplay"
                                  valueClassName="font-mono-nums text-sm text-emerald-700 dark:text-emerald-400"
                                  className="min-w-0 flex-1 sm:max-w-[9rem]"
                                >
                                  {formatDuration(session.duration_seconds ?? 0)}
                                </MetricEmeraldBlock>
                                <MetricEmeraldBlock
                                  label="Nota"
                                  valueClassName="tabular-nums text-emerald-700 dark:text-emerald-400"
                                  className="min-w-0 flex-1 sm:max-w-[6rem]"
                                >
                                  {session.score?.toFixed(1) ?? "—"}
                                </MetricEmeraldBlock>
                              </div>
                            </div>
                            <p
                              className={cn(
                                "mt-2 text-sm leading-relaxed",
                                (session.note ?? "").trim() !== ""
                                  ? "text-emerald-800 dark:text-emerald-300"
                                  : "text-muted-foreground",
                              )}
                            >
                              {(session.note ?? "").trim() !== ""
                                ? session.note
                                : "Sem resumo nesta sessão."}
                            </p>
                          </li>
                        );
                      })}
                    </ul>

                    {review ? (
                      <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            Review do ciclo
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {review.badge_name ? (
                              <Badge
                                variant="secondary"
                                className="rounded-md border border-emerald-500/25 bg-emerald-500/10 text-[10px] text-emerald-800 dark:text-emerald-400"
                              >
                                {review.badge_name}
                              </Badge>
                            ) : null}
                            <MetricEmeraldBlock
                              label="Nota"
                              valueClassName="font-mono-nums text-emerald-700 dark:text-emerald-400"
                              className="inline-block min-w-[3.5rem]"
                            >
                              {review.score.toFixed(1)}
                            </MetricEmeraldBlock>
                          </div>
                        </div>
                        <p
                          className={cn(
                            "mt-2 text-sm leading-relaxed",
                            review.text?.trim()
                              ? "text-emerald-800 dark:text-emerald-300"
                              : "text-muted-foreground",
                          )}
                        >
                          {review.text?.trim() ? review.text : "—"}
                        </p>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
