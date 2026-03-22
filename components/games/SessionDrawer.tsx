"use client";

import { useState, useEffect, useCallback } from "react";
import { useStopwatch } from "@/hooks/use-stopwatch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Play, Square, Pencil, Trash2, History } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import { DrawerGameHeader } from "@/components/games/DrawerGameHeader";
import { toastSuccess, toastError, getErrorMessage } from "@/lib/toast";
import { DRAWER_SHEET_CONTENT_CLASS } from "@/lib/drawer-sheet";

type CycleForSession = {
  id: string;
  name: string;
  created_at: string;
  sessions_count: number;
  total_duration_seconds: number;
  avg_session_score: number;
  status_name: string;
};

type SessionRow = {
  id: string;
  cycle_id: string;
  created_at: string;
  duration_seconds: number;
  note: string | null;
  score: number;
};

type SessionTab = "nova" | "historico";

interface SessionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId?: string;
  gameName?: string;
  cycleId?: string;
  cycleName?: string;
}

function formatCycleShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSessionWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionDrawer({
  open,
  onOpenChange,
  gameId,
  gameName,
  cycleId: initialCycleId,
  cycleName: initialCycleName,
}: SessionDrawerProps) {
  const [activeTab, setActiveTab] = useState<SessionTab>("nova");
  const {
    isRunning,
    setIsRunning,
    elapsed,
    reset: resetStopwatch,
    getElapsedSeconds,
  } = useStopwatch();
  const [note, setNote] = useState("");
  const [score, setScore] = useState("");
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>(
    initialCycleId,
  );
  const [selectedCycleName, setSelectedCycleName] = useState<
    string | undefined
  >(initialCycleName);

  const [editingSession, setEditingSession] = useState<SessionRow | null>(null);
  const [editDurationMin, setEditDurationMin] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editScore, setEditScore] = useState("");
  const [sessionIdToDelete, setSessionIdToDelete] = useState<string | null>(
    null,
  );

  const cycleId = selectedCycleId ?? initialCycleId;
  const cycleName = selectedCycleName ?? initialCycleName;

  useEffect(() => {
    if (!open) return;
    if (initialCycleId && initialCycleName) {
      setSelectedCycleId(initialCycleId);
      setSelectedCycleName(initialCycleName);
    } else {
      setSelectedCycleId(undefined);
      setSelectedCycleName(undefined);
    }
  }, [initialCycleId, initialCycleName, open]);

  useEffect(() => {
    if (!open) setActiveTab("nova");
  }, [open]);

  const supabase = createClient();
  const queryClient = useQueryClient();

  const resetTimer = useCallback(() => {
    resetStopwatch();
    setNote("");
    setScore("");
  }, [resetStopwatch]);

  const { data: activeCycles = [], isPending: cyclesLoading } = useQuery({
    queryKey: ["cycles_active_for_session", gameId],
    queryFn: async () => {
      if (!gameId) return [];
      const { data: statusRows } = await createClient()
        .from("status_types")
        .select("id")
        .or("name.ilike.%ativo%,name.ilike.%jogando%");
      const ids = (statusRows ?? []).map((s: { id: string }) => s.id);
      if (ids.length === 0) return [];

      const { data, error } = await createClient()
        .from("cycles_with_details")
        .select(
          "id, name, created_at, sessions_count, total_duration_seconds, avg_session_score, status_name",
        )
        .eq("game_id", gameId)
        .in("status_type_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CycleForSession[];
    },
    enabled: !!gameId && open,
  });

  /** Garante ciclo válido: mais recente primeiro na lista; fallback para o da fila se existir. */
  useEffect(() => {
    if (!open || activeCycles.length === 0) return;
    const inList = (id?: string) =>
      !!id && activeCycles.some((c) => c.id === id);
    if (inList(selectedCycleId)) return;
    if (initialCycleId && inList(initialCycleId)) {
      const c = activeCycles.find((x) => x.id === initialCycleId)!;
      setSelectedCycleId(c.id);
      setSelectedCycleName(c.name);
      return;
    }
    const newest = activeCycles[0];
    setSelectedCycleId(newest.id);
    setSelectedCycleName(newest.name);
  }, [open, activeCycles, initialCycleId, selectedCycleId]);

  const { data: cycleSessions = [] } = useQuery({
    queryKey: ["sessions_in_cycle", cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from("sessions")
        .select("id, cycle_id, created_at, duration_seconds, note, score")
        .eq("cycle_id", cycleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
    enabled: !!cycleId && open,
  });

  useEffect(() => {
    if (!open) resetTimer();
  }, [open, resetTimer]);

  const invalidateSessionQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    queryClient.invalidateQueries({ queryKey: ["sessions_in_cycle", cycleId] });
    queryClient.invalidateQueries({ queryKey: ["cycles_with_details"] });
    queryClient.invalidateQueries({
      queryKey: ["cycles_active_for_session", gameId],
    });
  }, [queryClient, cycleId, gameId]);

  const saveSession = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id || !cycleId || !gameId)
        throw new Error("Dados incompletos");
      const scoreNum = parseFloat(score) || 0;
      const { error } = await supabase.from("sessions").insert({
        cycle_id: cycleId,
        game_id: gameId,
        user_id: user.user.id,
        duration_seconds: getElapsedSeconds(),
        note: note.trim() || null,
        score: scoreNum,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSessionQueries();
      resetTimer();
      toastSuccess("Sessão salva");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const updateSession = useMutation({
    mutationFn: async (payload: {
      id: string;
      duration_seconds: number;
      note: string | null;
      score: number;
    }) => {
      const { error } = await supabase
        .from("sessions")
        .update({
          duration_seconds: payload.duration_seconds,
          note: payload.note,
          score: payload.score,
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSessionQueries();
      setEditingSession(null);
      toastSuccess("Sessão atualizada");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSessionQueries();
      setSessionIdToDelete(null);
      toastSuccess("Sessão excluída");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const openEdit = (s: SessionRow) => {
    setEditingSession(s);
    setEditDurationMin(
      (s.duration_seconds / 60).toFixed(1).replace(/\.0$/, ""),
    );
    setEditNote(s.note ?? "");
    setEditScore(String(s.score ?? ""));
  };

  const submitEdit = () => {
    if (!editingSession) return;
    const min = parseFloat(editDurationMin.replace(",", "."));
    if (Number.isNaN(min) || min < 0) {
      toastError("Duração inválida");
      return;
    }
    const duration_seconds = Math.round(min * 60);
    const scoreNum = parseFloat(editScore.replace(",", ".")) || 0;
    updateSession.mutate({
      id: editingSession.id,
      duration_seconds,
      note: editNote.trim() || null,
      score: scoreNum,
    });
  };

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  const tabNav = (
    <div className="flex border-b border-border">
      <button
        type="button"
        onClick={() => setActiveTab("nova")}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors -mb-px",
          activeTab === "nova"
            ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        <Play className="h-3.5 w-3.5 shrink-0" />
        Nova sessão
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("historico")}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors -mb-px",
          activeTab === "historico"
            ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        <History className="h-3.5 w-3.5 shrink-0" />
        Histórico
      </button>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className={DRAWER_SHEET_CONTENT_CLASS}>
          <SheetHeader className="space-y-0 border-b border-border px-6 pb-4 pt-6 text-left">
            <SheetTitle className="sr-only">Sessão</SheetTitle>
            <DrawerGameHeader label="Sessão" gameName={gameName} />
          </SheetHeader>

          {/* Faixa fixa: ciclo (select compacto — mais recente → mais antigo) */}
          <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-4">
            <Label
              htmlFor="session-cycle-select"
              className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Ciclo ativo
            </Label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Ordem: mais recente no topo. Vários rejogos? Escolha na lista.
            </p>
            {cyclesLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Carregando ciclos…
              </p>
            ) : activeCycles.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum ciclo em andamento. Crie um no drawer <b>Ciclo</b>.
              </p>
            ) : (
              <Select
                value={cycleId ?? ""}
                onValueChange={(id) => {
                  const c = activeCycles.find((x) => x.id === id);
                  if (c) {
                    setSelectedCycleId(c.id);
                    setSelectedCycleName(c.name);
                  }
                }}
              >
                <SelectTrigger
                  id="session-cycle-select"
                  className="mt-3 h-auto min-h-10 w-full rounded-lg border-emerald-500/30 bg-background py-2 text-left [&>span]:line-clamp-none"
                >
                  <SelectValue placeholder="Selecione um ciclo">
                    {cycleName ? (
                      <span className="line-clamp-2 text-left font-medium">
                        {cycleName}
                      </span>
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="max-h-[min(70vh,320px)] w-[var(--radix-select-trigger-width)] rounded-lg"
                >
                  {activeCycles.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      className="cursor-pointer py-2.5 pl-8 pr-2"
                    >
                      <span className="flex flex-col gap-0.5 text-left">
                        <span className="line-clamp-2 font-medium leading-snug">
                          {c.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatCycleShortDate(c.created_at)} ·{" "}
                          {c.sessions_count ?? 0} sessões
                          {Number(c.avg_session_score) > 0
                            ? ` · média ${Number(c.avg_session_score).toFixed(1)}`
                            : ""}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {tabNav}

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {activeTab === "nova" && (
              <div className="space-y-5">
                <p className="text-[11px] text-muted-foreground">
                  Use o cronômetro, defina a nota e o resumo, depois salve.
                </p>

                <div className="flex flex-col items-center gap-4 rounded-xl border border-border/60 bg-muted/20 py-6">
                  <div className="font-mono-nums text-4xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {pad(hours)}:{pad(minutes)}:{pad(seconds)}
                  </div>
                  <Button
                    onClick={() => setIsRunning(!isRunning)}
                    size="sm"
                    className="w-36 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {isRunning ? (
                      <>
                        <Square className="mr-2 h-3 w-3" /> Parar
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-3 w-3" /> Iniciar
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Nota desta sessão
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="8.5"
                    className="h-10 max-w-[120px] rounded-lg border-emerald-500/25 font-mono-nums focus-visible:ring-emerald-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Resumo da sessão
                  </Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="O que você sentiu nessa sessão?"
                    className="min-h-[120px] resize-none rounded-lg border-border/80 text-sm"
                  />
                </div>

                <Button
                  variant="outline"
                  className="h-11 w-full rounded-lg border-emerald-500/45 text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300"
                  disabled={
                    elapsed === 0 || saveSession.isPending || !cycleId
                  }
                  onClick={() => saveSession.mutate()}
                >
                  {saveSession.isPending ? "Salvando…" : "Salvar sessão"}
                </Button>
              </div>
            )}

            {activeTab === "historico" && (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  {cycleId && cycleName
                    ? `Sessões do ciclo selecionado, da mais recente para a mais antiga.`
                    : "Selecione um ciclo acima."}
                </p>
                {!cycleId ? (
                  <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    Escolha um ciclo na faixa superior para ver o histórico.
                  </p>
                ) : cycleSessions.length === 0 ? (
                  <p className="rounded-lg border border-border/60 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma sessão neste ciclo ainda.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {cycleSessions.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-xl border border-border/60 bg-card p-4"
                      >
                        <p className="text-xs font-medium text-foreground">
                          {formatSessionWhen(s.created_at)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          <span>
                            <span className="text-muted-foreground">
                              Gameplay:{" "}
                            </span>
                            <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                              {formatDuration(s.duration_seconds ?? 0)}
                            </span>
                          </span>
                          <span>
                            <span className="text-muted-foreground">
                              Nota:{" "}
                            </span>
                            <span className="tabular-nums font-semibold">
                              {typeof s.score === "number"
                                ? s.score.toFixed(1)
                                : "—"}
                            </span>
                          </span>
                        </div>
                        {(s.note ?? "").trim() !== "" && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {s.note}
                          </p>
                        )}
                        <div className="mt-3 flex justify-end gap-1.5 border-t border-border/50 pt-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-md text-xs"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="mr-1.5 h-3 w-3" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-md border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => setSessionIdToDelete(s.id)}
                          >
                            <Trash2 className="mr-1.5 h-3 w-3" />
                            Excluir
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!editingSession}
        onOpenChange={(o) => !o && setEditingSession(null)}
      >
        <DialogContent className="max-h-[min(90vh,720px)] w-[min(100vw-1.5rem,800px)] max-w-none rounded-xl border-emerald-500/20 p-0 sm:max-w-none">
          <div className="border-b border-emerald-500/15 bg-muted/20 px-6 py-4 pr-14">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-base font-semibold">
                Editar sessão
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Ajuste duração, nota e o resumo da sessão.
              </p>
            </DialogHeader>
          </div>
          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label className="text-xs font-medium">Duração (minutos)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editDurationMin}
                  onChange={(e) => setEditDurationMin(e.target.value)}
                  placeholder="ex.: 45 ou 1,5"
                  className="h-10 w-full rounded-lg border-emerald-500/25 font-mono-nums focus-visible:ring-emerald-500/30"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label className="text-xs font-medium">Nota</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                  className="h-10 w-full rounded-lg border-emerald-500/25 font-mono-nums focus-visible:ring-emerald-500/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Resumo</Label>
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Texto da sessão…"
                className="min-h-[200px] resize-y rounded-lg border-emerald-500/25 text-sm leading-relaxed focus-visible:ring-emerald-500/30"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-border/60 bg-muted/10 px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-emerald-500/35 text-emerald-900 hover:bg-emerald-500/10 dark:text-emerald-200"
              onClick={() => setEditingSession(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={updateSession.isPending}
              onClick={submitEdit}
            >
              {updateSession.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!sessionIdToDelete}
        onOpenChange={(o) => !o && setSessionIdToDelete(null)}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A sessão será removida do
              histórico deste ciclo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSession.isPending}
              onClick={() =>
                sessionIdToDelete && deleteSession.mutate(sessionIdToDelete)
              }
            >
              {deleteSession.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
