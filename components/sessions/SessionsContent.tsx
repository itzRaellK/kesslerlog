"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RefreshCw, Play, MessageSquare, ChevronRight } from "lucide-react";
import { CycleDrawer } from "@/components/games/CycleDrawer";
import { SessionDrawer } from "@/components/games/SessionDrawer";
import { ReviewDrawer } from "@/components/games/ReviewDrawer";
import {
  toastSuccess,
  toastError,
  getErrorMessage,
} from "@/lib/toast";

function formatHMFromSeconds(totalSeconds: number) {
  const sec = totalSeconds ?? 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h <= 0) return `${m}min`;
  return `${h}h ${m}min`;
}

/** Estilo do chip de status do ciclo (Jogando = verde, não azul). */
function cycleStatusChipClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("finalizado")) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400";
  }
  if (s.includes("jogando")) {
    return "border-emerald-500/35 bg-emerald-500/15 text-emerald-800 dark:text-emerald-400";
  }
  return "border-border/60 bg-muted text-muted-foreground";
}

/** Ex.: "Quarta-feira, 18 de março de 2025" */
function formatLongDatePtBR(iso: string) {
  const d = new Date(iso);
  let out = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return out.charAt(0).toUpperCase() + out.slice(1);
}

const MONTH_LABEL_BY_KEY: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

type SuggestItem = {
  label: string;
  value: string;
  /** Texto extra para busca (ex.: mês: "01", "1") sem aparecer na lista */
  searchExtra?: string;
};

/** Input com lista de sugestões ao digitar (match por texto). */
function AutocompleteFilterInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  inputClassName,
  maxVisible = 8,
  dropdownClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: SuggestItem[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  maxVisible?: number;
  dropdownClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = !q
      ? suggestions
      : suggestions.filter((s) => {
          const extra = (s.searchExtra ?? "").toLowerCase();
          return (
            s.label.toLowerCase().includes(q) ||
            s.value.toLowerCase().includes(q) ||
            extra.includes(q)
          );
        });
    return list.slice(0, maxVisible);
  }, [value, suggestions, maxVisible]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && filtered.length > 0}
      />
      {open && filtered.length > 0 && (
        <ul
          className={cn(
            "absolute z-50 mt-1 w-full overflow-auto rounded-md border border-border bg-card text-foreground shadow-md max-h-48",
            dropdownClassName,
          )}
          role="listbox"
        >
          {filtered.map((s, i) => (
            <li key={`${s.value}-${s.label}-${i}`} role="option">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s.value);
                  setOpen(false);
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SessionsContent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [selectedGameId, setSelectedGameId] = useState<string | undefined>();

  const [cycleDrawer, setCycleDrawer] = useState<{
    open: boolean;
    gameId?: string;
    gameName?: string;
  }>({ open: false });

  const [sessionDrawer, setSessionDrawer] = useState<{
    open: boolean;
    gameId?: string;
    gameName?: string;
    cycleId?: string;
    cycleName?: string;
  }>({ open: false });

  const [reviewDrawer, setReviewDrawer] = useState<{
    open: boolean;
    gameId?: string;
    gameName?: string;
  }>({ open: false });

  const { data: queueItems = [] } = useQuery({
    queryKey: ["waitlist_top10"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist_with_details")
        .select("id, position, game_id, game_title, game_image_url")
        .order("position")
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const queueGameIds = useMemo(
    () => queueItems.map((i: { game_id: string }) => i.game_id),
    [queueItems],
  );

  const { data: queueGames = [] } = useQuery({
    queryKey: ["games_in_queue", queueGameIds],
    enabled: queueGameIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games_with_details")
        .select("id, game_status_name")
        .in("id", queueGameIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const queueGameStatusById = useMemo(() => {
    const map: Record<string, string> = {};
    (queueGames ?? []).forEach(
      (g: { id: string; game_status_name: string }) => {
        map[g.id] = g.game_status_name ?? "—";
      },
    );
    return map;
  }, [queueGames]);

  const queueTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    (queueItems ?? []).forEach((i: { game_id: string; game_title: string }) => {
      map[i.game_id] = i.game_title;
    });
    return map;
  }, [queueItems]);

  useEffect(() => {
    if (queueItems.length === 0) return;
    const first = queueItems[0].game_id;
    setSelectedGameId((prev) => {
      if (!prev) return first;
      if (queueGameIds.includes(prev)) return prev;
      return first;
    });
  }, [queueItems, queueGameIds]);

  const {
    data: activeCycleByGame = {} as Record<
      string,
      { id: string; name: string }
    >,
  } = useQuery({
    queryKey: ["cycles_active_by_game_queue", queueGameIds],
    enabled: queueGameIds.length > 0,
    queryFn: async () => {
      const { data: statusRows } = await supabase
        .from("status_types")
        .select("id")
        .or("name.ilike.%ativo%,name.ilike.%jogando%");
      const ids = (statusRows ?? []).map((s: { id: string }) => s.id);
      if (ids.length === 0) return {};

      const { data, error } = await supabase
        .from("cycles")
        .select("game_id, id, name, created_at")
        .in("game_id", queueGameIds)
        .in("status_type_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const map: Record<string, { id: string; name: string }> = {};
      (data ?? []).forEach(
        (c: { game_id: string; id: string; name: string }) => {
          // Como a query já vem ordenada desc, basta pegar o primeiro por jogo.
          if (!map[c.game_id]) map[c.game_id] = { id: c.id, name: c.name };
        },
      );
      return map;
    },
  });

  const moveGameToTop = useMutation({
    mutationFn: async (gameId: string) => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      if (!userId) throw new Error("Não autenticado");

      const { data: rows, error } = await supabase
        .from("waitlist")
        .select("id, game_id, position")
        .eq("user_id", userId)
        .order("position", { ascending: true });
      if (error) throw error;

      const list = (rows ?? []) as Array<{
        id: string;
        game_id: string;
        position: number;
      }>;
      const idx = list.findIndex((r) => r.game_id === gameId);
      if (idx === -1) return;

      const selected = list[idx];
      const reordered = [selected, ...list.filter((r) => r.id !== selected.id)];

      for (let i = 0; i < reordered.length; i++) {
        const row = reordered[i];
        const { error: updErr } = await supabase
          .from("waitlist")
          .update({ position: i + 1 })
          .eq("id", row.id);
        if (updErr) throw updErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist_top10"] });
      queryClient.invalidateQueries({
        queryKey: ["cycles_active_by_game_queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cycles_finished_by_game_queue"],
      });
      toastSuccess("Jogo movido para o topo da fila");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const removeFromQueue = useMutation({
    mutationFn: async (gameId: string) => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      if (!userId) throw new Error("Não autenticado");

      const { error: delErr } = await supabase
        .from("waitlist")
        .delete()
        .eq("user_id", userId)
        .eq("game_id", gameId);
      if (delErr) throw delErr;

      const { data: remaining, error: selErr } = await supabase
        .from("waitlist")
        .select("id")
        .eq("user_id", userId)
        .order("position", { ascending: true });
      if (selErr) throw selErr;

      // Reindexa as posições para evitar buracos na fila.
      for (let i = 0; i < (remaining ?? []).length; i++) {
        const row = remaining[i] as { id: string };
        const { error: updErr } = await supabase
          .from("waitlist")
          .update({ position: i + 1 })
          .eq("id", row.id);
        if (updErr) throw updErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist_top10"] });
      queryClient.invalidateQueries({
        queryKey: ["cycles_active_by_game_queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cycles_finished_by_game_queue"],
      });
      toastSuccess("Removido da fila de jogos");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  // ---------------------------
  // Histórico (filtro textual)
  // ---------------------------
  const [historyGameFilter, setHistoryGameFilter] = useState("");
  const [historyCycleFilter, setHistoryCycleFilter] = useState("");
  const [historyYearFilter, setHistoryYearFilter] = useState("");
  const [historyMonthFilter, setHistoryMonthFilter] = useState("");

  const { data: allGamesForSuggest = [] } = useQuery({
    queryKey: ["games_all_for_history_filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, title")
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allCyclesForSuggest = [] } = useQuery({
    queryKey: ["cycles_all_for_history_filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycles_with_details")
        .select("id, name")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const seen = new Set<string>();
      const uniq: Array<{ id: string; name: string }> = [];
      for (const c of data ?? []) {
        const n = c.name?.trim() ?? "";
        if (!n || seen.has(n)) continue;
        seen.add(n);
        uniq.push({ id: c.id, name: n });
      }
      return uniq.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
  });

  /** Janeiro → Dezembro; só o nome na lista; busca ainda aceita "03", "3", etc. */
  const monthSuggestItems: SuggestItem[] = useMemo(() => {
    const keys = [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ] as const;
    return keys.map((key) => {
      const label = MONTH_LABEL_BY_KEY[key];
      const n = String(parseInt(key, 10));
      return {
        label,
        value: label,
        searchExtra: `${key} ${n}`,
      };
    });
  }, []);

  const gameSuggestItems: SuggestItem[] = useMemo(
    () =>
      (allGamesForSuggest as Array<{ id: string; title: string }>).map((g) => ({
        label: g.title,
        value: g.title,
      })),
    [allGamesForSuggest],
  );

  const cycleSuggestItems: SuggestItem[] = useMemo(
    () =>
      (allCyclesForSuggest as Array<{ id: string; name: string }>).map((c) => ({
        label: c.name,
        value: c.name,
      })),
    [allCyclesForSuggest],
  );

  const { data: historySessionsRaw = [] } = useQuery({
    queryKey: ["history_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "id, game_id, cycle_id, created_at, duration_seconds, note, score",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const yearSuggestItems: SuggestItem[] = useMemo(() => {
    const set = new Set<string>();
    const y = new Date().getFullYear();
    for (let i = 0; i < 20; i++) set.add(String(y - i));
    (historySessionsRaw as Array<{ created_at: string }>).forEach((s) => {
      if (!s.created_at) return;
      set.add(String(new Date(s.created_at).getFullYear()));
    });
    return Array.from(set)
      .sort((a, b) => b.localeCompare(a))
      .map((year) => ({ label: year, value: year }));
  }, [historySessionsRaw]);

  const historyCycleIds = useMemo(
    () => historySessionsRaw.map((s: { cycle_id: string }) => s.cycle_id),
    [historySessionsRaw],
  );
  const historyGameIds = useMemo(
    () => historySessionsRaw.map((s: { game_id: string }) => s.game_id),
    [historySessionsRaw],
  );

  const { data: historyCyclesRows = [] } = useQuery({
    queryKey: ["history_cycles_rows", historyCycleIds.join(",")],
    enabled: historyCycleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycles_with_details")
        .select("id, name, status_name")
        .in("id", historyCycleIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const historyCyclesById = useMemo(() => {
    const map: Record<string, { name: string; status_name: string }> = {};
    (historyCyclesRows ?? []).forEach(
      (c: { id: string; name: string; status_name: string }) => {
        map[c.id] = { name: c.name, status_name: c.status_name };
      },
    );
    return map;
  }, [historyCyclesRows]);

  const { data: historyGamesRows = [] } = useQuery({
    queryKey: ["history_games_rows", historyGameIds.join(",")],
    enabled: historyGameIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, title")
        .in("id", historyGameIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const historyGamesById = useMemo(() => {
    const map: Record<string, { title: string }> = {};
    (historyGamesRows ?? []).forEach((g: { id: string; title: string }) => {
      map[g.id] = { title: g.title };
    });
    return map;
  }, [historyGamesRows]);

  type HistorySessionRow = {
    id: string;
    game_id: string;
    cycle_id: string;
    created_at: string;
    duration_seconds: number;
    note: string | null;
    score: number;
  };

  const filteredHistorySessions = useMemo(() => {
    const gameTerm = historyGameFilter.trim().toLowerCase();
    const cycleTerm = historyCycleFilter.trim().toLowerCase();
    const yearTerm = historyYearFilter.trim().toLowerCase();
    const monthTerm = historyMonthFilter.trim().toLowerCase();

    return historySessionsRaw.filter(
      (s: { game_id: string; cycle_id: string; created_at: string }) => {
        const cycle = historyCyclesById?.[s.cycle_id];
        const gameTitle = historyGamesById?.[s.game_id]?.title ?? "";
        const dt = s.created_at ? new Date(s.created_at) : null;
        const year = dt ? String(dt.getFullYear()) : "";
        const monthKey = dt ? String(dt.getMonth() + 1).padStart(2, "0") : "";
        const monthLabel = MONTH_LABEL_BY_KEY[monthKey] ?? monthKey;

        const gameMatches =
          !gameTerm || gameTitle.toLowerCase().includes(gameTerm);
        const cycleMatches =
          !cycleTerm || (cycle?.name ?? "").toLowerCase().includes(cycleTerm);
        const yearMatches = !yearTerm || year.toLowerCase().includes(yearTerm);
        const monthMatches =
          !monthTerm ||
          monthKey.includes(monthTerm) ||
          monthLabel.toLowerCase().includes(monthTerm);

        return gameMatches && cycleMatches && yearMatches && monthMatches;
      },
    ) as HistorySessionRow[];
  }, [
    historySessionsRaw,
    historyCyclesById,
    historyGamesById,
    historyGameFilter,
    historyCycleFilter,
    historyYearFilter,
    historyMonthFilter,
  ]);

  /**
   * Lista plana: cada item = jogo + ciclo (um collapse), sessões mais novas primeiro.
   * Ordem global: ciclo cuja sessão mais recente é a mais nova vem primeiro.
   */
  const organizedHistoryEntries = useMemo(() => {
    const byGame = new Map<string, HistorySessionRow[]>();
    for (const s of filteredHistorySessions) {
      const arr = byGame.get(s.game_id) ?? [];
      arr.push(s);
      byGame.set(s.game_id, arr);
    }

    type Entry = {
      key: string;
      gameId: string;
      gameTitle: string;
      cycleId: string;
      cycleName: string;
      statusName: string;
      sessions: HistorySessionRow[];
    };

    const entries: Entry[] = [];

    for (const [gameId, sess] of byGame) {
      const byCycle = new Map<string, HistorySessionRow[]>();
      for (const s of sess) {
        const arr = byCycle.get(s.cycle_id) ?? [];
        arr.push(s);
        byCycle.set(s.cycle_id, arr);
      }

      for (const [cycleId, cycleSessions] of byCycle) {
        cycleSessions.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const c = historyCyclesById?.[cycleId];
        entries.push({
          key: `${gameId}-${cycleId}`,
          gameId,
          gameTitle: historyGamesById?.[gameId]?.title ?? "—",
          cycleId,
          cycleName: c?.name ?? "—",
          statusName: c?.status_name ?? "—",
          sessions: cycleSessions,
        });
      }
    }

    entries.sort(
      (a, b) =>
        new Date(b.sessions[0].created_at).getTime() -
        new Date(a.sessions[0].created_at).getTime(),
    );

    return entries;
  }, [filteredHistorySessions, historyCyclesById, historyGamesById]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Sessões e Reviews</h1>
      </div>

      <section className="rounded-md border border-border bg-card p-4 space-y-4">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Fila (até 10)
        </div>

        {queueItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            Nenhum jogo na fila. Adicione jogos na página de <b>Jogos</b>.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {queueItems.map(
              (item: {
                id: string;
                position: number;
                game_id: string;
                game_title: string;
                game_image_url: string | null;
              }) => {
                const isSelected = selectedGameId === item.game_id;
                const activeCycle = activeCycleByGame?.[item.game_id];
                const statusName = queueGameStatusById[item.game_id] ?? "—";

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-md border bg-card p-3 shadow-sm min-h-[220px] flex flex-col",
                      isSelected ? "border-emerald-500/70" : "border-border",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedGameId(item.game_id)}
                      className="w-full text-left flex flex-col gap-3 flex-1"
                    >
                      <div className="aspect-[3/4] w-full overflow-hidden rounded-md bg-muted border border-border flex items-center justify-center">
                        {item.game_image_url ? (
                          <img
                            src={item.game_image_url}
                            alt={item.game_title}
                            className="h-full w-full object-contain"
                          />
                        ) : null}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <p className="text-base font-semibold leading-tight line-clamp-2">
                          {item.game_title}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
                          >
                            {statusName}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] rounded-md px-2 py-0.5 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                          >
                            #{item.position}
                          </Badge>
                        </div>
                      </div>
                    </button>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-md h-9 text-xs px-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                        onClick={() =>
                          setCycleDrawer({
                            open: true,
                            gameId: item.game_id,
                            gameName: item.game_title,
                          })
                        }
                        title="Criar/Finalizar ciclo"
                      >
                        <RefreshCw className="mr-2 h-3.5 w-3.5" />
                        Ciclo
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-md h-9 text-xs px-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                        onClick={() =>
                          setSessionDrawer({
                            open: true,
                            gameId: item.game_id,
                            gameName: item.game_title,
                            cycleId: activeCycle?.id,
                            cycleName: activeCycle?.name,
                          })
                        }
                        title="Iniciar/Continuar sessão"
                      >
                        <Play className="mr-2 h-3.5 w-3.5" />
                        Sessão
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-md h-9 text-xs px-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                        onClick={() =>
                          setReviewDrawer({
                            open: true,
                            gameId: item.game_id,
                            gameName: item.game_title,
                          })
                        }
                        title="Escrever review ou finalizar ciclo"
                      >
                        <MessageSquare className="mr-2 h-3.5 w-3.5" />
                        Review
                      </Button>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>

      <section className="rounded-md border border-border bg-card p-4 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Histórico organizado
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-md border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
            onClick={() => {
              setHistoryGameFilter("");
              setHistoryCycleFilter("");
              setHistoryYearFilter("");
              setHistoryMonthFilter("");
            }}
            disabled={
              !historyGameFilter.trim() &&
              !historyCycleFilter.trim() &&
              !historyYearFilter.trim() &&
              !historyMonthFilter.trim()
            }
          >
            Limpar filtros
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2 flex-[1_1_260px]">
            <div className="text-xs font-medium text-muted-foreground">
              Game
            </div>
            <AutocompleteFilterInput
              value={historyGameFilter}
              onChange={setHistoryGameFilter}
              suggestions={gameSuggestItems}
              placeholder="Digite para buscar o jogo…"
              inputClassName="rounded-md"
            />
          </div>

          <div className="space-y-2 flex-[1_1_240px]">
            <div className="text-xs font-medium text-muted-foreground">
              Ciclo
            </div>
            <AutocompleteFilterInput
              value={historyCycleFilter}
              onChange={setHistoryCycleFilter}
              suggestions={cycleSuggestItems}
              placeholder="Digite para buscar o ciclo…"
              inputClassName="rounded-md"
            />
          </div>

          <div className="space-y-2 w-[180px]">
            <div className="text-xs font-medium text-muted-foreground">Mês</div>
            <AutocompleteFilterInput
              value={historyMonthFilter}
              onChange={setHistoryMonthFilter}
              suggestions={monthSuggestItems}
              placeholder="Ex.: março"
              inputClassName="rounded-md"
              maxVisible={12}
              dropdownClassName="max-h-72"
            />
          </div>

          <div className="space-y-2 w-[160px]">
            <div className="text-xs font-medium text-muted-foreground">Ano</div>
            <AutocompleteFilterInput
              value={historyYearFilter}
              onChange={setHistoryYearFilter}
              suggestions={yearSuggestItems}
              placeholder="Ex.: 2026"
              inputClassName="rounded-md"
            />
          </div>
        </div>

        <div className="space-y-3">
          {organizedHistoryEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              Nenhuma sessão encontrada com esses filtros.
            </p>
          ) : (
            organizedHistoryEntries.map((entry) => {
              const status = entry.statusName;
              const nSessions = entry.sessions.length;

              return (
                <details
                  key={entry.key}
                  className="group rounded-xl border border-border/60 bg-card/90"
                >
                  <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden hover:bg-muted/30 rounded-xl">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-base font-semibold leading-tight">
                        {entry.gameTitle}
                      </p>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {entry.cycleName}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[10px] font-medium",
                          cycleStatusChipClass(status),
                        )}
                      >
                        {status}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums sm:text-xs">
                        {nSessions}{" "}
                        {nSessions === 1 ? "sessão" : "sessões"}
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-border/50 px-4 pb-4 pt-2">
                    <ul className="divide-y divide-border/40">
                      {entry.sessions.map((s) => {
                        const timePart = new Date(s.created_at).toLocaleTimeString(
                          "pt-BR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        );
                        const dur = formatHMFromSeconds(
                          s.duration_seconds ?? 0,
                        );
                        const scoreStr =
                          typeof s.score === "number"
                            ? s.score.toFixed(1)
                            : "—";
                        const longDate = formatLongDatePtBR(s.created_at);

                        return (
                          <li key={s.id} className="list-none py-3.5 first:pt-2">
                            {/* Data por extenso (dia, mês, ano) – horário | chips duração + média */}
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 text-sm leading-snug">
                                <span className="font-medium text-foreground">
                                  {longDate}
                                </span>
                                <span className="text-muted-foreground/80">
                                  {" "}
                                  –{" "}
                                </span>
                                <span className="font-semibold tabular-nums text-foreground">
                                  {timePart}
                                </span>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                                <Badge
                                  variant="secondary"
                                  className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-800 dark:text-emerald-400"
                                >
                                  {dur}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-800 dark:text-emerald-400"
                                >
                                  {scoreStr}
                                </Badge>
                              </div>
                            </div>

                            <p
                              className="mt-2 text-sm leading-relaxed text-muted-foreground break-words"
                              title={s.note?.trim() ? s.note : undefined}
                            >
                              {(s.note ?? "").trim() !== ""
                                ? s.note
                                : "—"}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </details>
              );
            })
          )}
        </div>
      </section>

      <CycleDrawer
        open={cycleDrawer.open}
        onOpenChange={(o) => setCycleDrawer((prev) => ({ ...prev, open: o }))}
        gameId={cycleDrawer.gameId}
        gameName={cycleDrawer.gameName}
        onCycleCreated={(payload) => {
          const gId = payload.gameId;
          if (!gId) return;
          setSelectedGameId(gId);
          moveGameToTop.mutate(gId);
        }}
      />
      <SessionDrawer
        open={sessionDrawer.open}
        onOpenChange={(o) => setSessionDrawer((prev) => ({ ...prev, open: o }))}
        gameId={sessionDrawer.gameId}
        gameName={sessionDrawer.gameName}
        cycleId={sessionDrawer.cycleId}
        cycleName={sessionDrawer.cycleName}
      />
      <ReviewDrawer
        open={reviewDrawer.open}
        onOpenChange={(o) => setReviewDrawer((prev) => ({ ...prev, open: o }))}
        gameId={reviewDrawer.gameId}
        gameName={reviewDrawer.gameName}
        onReviewSaved={() => {
          if (!reviewDrawer.gameId) return;
          removeFromQueue.mutate(reviewDrawer.gameId);
        }}
      />
    </div>
  );
}
