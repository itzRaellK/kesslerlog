"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DRAWER_SHEET_CONTENT_CLASS } from "@/lib/drawer-sheet";
import { DrawerGameHeader } from "@/components/games/DrawerGameHeader";
import {
  toastSuccess,
  toastError,
  getErrorMessage,
} from "@/lib/toast";

interface CycleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId?: string;
  gameName?: string;
  onCycleCreated?: (payload: { gameId?: string }) => void;
}

export function CycleDrawer({
  open,
  onOpenChange,
  gameId,
  gameName,
  onCycleCreated,
}: CycleDrawerProps) {
  const [newCycleName, setNewCycleName] = useState("");
  const [cyclePendingDelete, setCyclePendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: statusTypes = [] } = useQuery({
    queryKey: ["status_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("status_types")
        .select("id, name")
        .eq("active", true)
        .order("order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeStatusId = statusTypes.find(
    (s: { name: string }) =>
      s.name.toLowerCase() === "ativo" || s.name.toLowerCase() === "jogando",
  )?.id;
  const finishedStatusId = statusTypes.find(
    (s: { name: string }) => s.name.toLowerCase() === "finalizado",
  )?.id;

  const { data: gameStatusTypes = [] } = useQuery({
    queryKey: ["game_status_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_status_types")
        .select("id, name")
        .eq("active", true)
        .order("order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const gameStatusJogandoId = gameStatusTypes.find(
    (s: { name: string }) => s.name.toLowerCase() === "jogando",
  )?.id;
  const gameStatusConcluidoId = gameStatusTypes.find(
    (s: { name: string }) => s.name.toLowerCase() === "concluído",
  )?.id;
  const gameStatusRejogandoId = gameStatusTypes.find(
    (s: { name: string }) => s.name.toLowerCase() === "rejogando",
  )?.id;
  const gameStatusNaoIniciadoId = gameStatusTypes.find(
    (s: { name: string }) => s.name.toLowerCase() === "não iniciado",
  )?.id;

  const { data: gameCycles = [] } = useQuery({
    queryKey: ["cycles", gameId],
    queryFn: async () => {
      if (!gameId) return [];
      const { data, error } = await supabase
        .from("cycles_with_details")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!gameId && open,
  });

  const createCycle = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id || !gameId || !activeStatusId)
        throw new Error("Dados incompletos");
      const { error } = await supabase.from("cycles").insert({
        game_id: gameId,
        user_id: user.user.id,
        name: newCycleName.trim(),
        status_type_id: activeStatusId,
      });
      if (error) throw error;
      const { data: game } = await supabase
        .from("games")
        .select("game_status_type_id")
        .eq("id", gameId)
        .single();
      const { data: gst } = await supabase
        .from("game_status_types")
        .select("name")
        .eq("id", game?.game_status_type_id ?? "")
        .maybeSingle();
      const currentStatusName = gst?.name?.toLowerCase() ?? "não iniciado";
      const newGameStatusId =
        currentStatusName === "concluído"
          ? gameStatusRejogandoId
          : gameStatusJogandoId;
      if (newGameStatusId) {
        await supabase
          .from("games")
          .update({ game_status_type_id: newGameStatusId })
          .eq("id", gameId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      queryClient.invalidateQueries({ queryKey: ["cycles_with_details"] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["games_with_details"] });
      queryClient.invalidateQueries({
        queryKey: ["cycles_active_by_game_queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cycles_finished_by_game_queue"],
      });
      setNewCycleName("");
      onCycleCreated?.({ gameId });
      toastSuccess("Ciclo criado");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const finishCycle = useMutation({
    mutationFn: async (cycleId: string) => {
      if (!finishedStatusId || !gameStatusConcluidoId)
        throw new Error("Status não encontrado");
      const { error } = await supabase
        .from("cycles")
        .update({
          status_type_id: finishedStatusId,
          finished_at: new Date().toISOString(),
        })
        .eq("id", cycleId);
      if (error) throw error;
      if (gameId) {
        await supabase
          .from("games")
          .update({ game_status_type_id: gameStatusConcluidoId })
          .eq("id", gameId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      queryClient.invalidateQueries({ queryKey: ["cycles_with_details"] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["games_with_details"] });
      queryClient.invalidateQueries({
        queryKey: ["cycles_active_by_game_queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cycles_finished_by_game_queue"],
      });
      toastSuccess("Ciclo finalizado");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const deleteCycle = useMutation({
    mutationFn: async (cycleId: string) => {
      if (!gameId) throw new Error("Jogo não encontrado");
      const { error } = await supabase
        .from("cycles")
        .delete()
        .eq("id", cycleId);
      if (error) throw error;

      // Recalcula status do jogo com base no ciclo mais recente.
      const { data: latest } = await supabase
        .from("cycles_with_details")
        .select("status_name")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const latestStatusName = latest?.status_name?.toLowerCase() ?? "";
      let newGameStatusTypeId: string | undefined;
      if (!latestStatusName) newGameStatusTypeId = gameStatusNaoIniciadoId;
      else if (latestStatusName.includes("finalizado"))
        newGameStatusTypeId = gameStatusConcluidoId;
      else newGameStatusTypeId = gameStatusJogandoId;

      if (newGameStatusTypeId) {
        await supabase
          .from("games")
          .update({ game_status_type_id: newGameStatusTypeId })
          .eq("id", gameId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      queryClient.invalidateQueries({ queryKey: ["cycles_with_details"] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["games_with_details"] });
      queryClient.invalidateQueries({
        queryKey: ["cycles_active_by_game_queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cycles_finished_by_game_queue"],
      });
      setCyclePendingDelete(null);
      toastSuccess("Ciclo excluído");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const nCycles = gameCycles.length;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={DRAWER_SHEET_CONTENT_CLASS}>
        <SheetHeader className="space-y-0 border-b border-border px-6 pb-4 pt-6 text-left">
          <SheetTitle className="sr-only">Ciclos</SheetTitle>
          <DrawerGameHeader label="Ciclos" gameName={gameName}>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1 text-xs font-medium tabular-nums text-emerald-800 dark:text-emerald-300">
                {nCycles} {nCycles === 1 ? "ciclo" : "ciclos"} no total
              </span>
            </div>
          </DrawerGameHeader>
        </SheetHeader>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-8">
          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Novo ciclo
              </p>
              <p className="text-[11px] text-muted-foreground">
                Dê um nome e crie para começar a registrar sessões.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Input
                value={newCycleName}
                onChange={(e) => setNewCycleName(e.target.value)}
                placeholder="Nome do novo ciclo"
                className="h-10 flex-1 rounded-lg border-emerald-500/20 bg-background text-sm focus-visible:ring-emerald-500/30"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-10 shrink-0 rounded-lg border-emerald-500/40 px-4 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                disabled={!newCycleName.trim() || createCycle.isPending}
                onClick={() => createCycle.mutate()}
              >
                <Plus className="mr-2 h-3.5 w-3.5" /> Criar
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Ciclos existentes
              </p>
              <p className="text-[11px] text-muted-foreground">
                Sessões, tempo total de gameplay e média das notas por ciclo.
              </p>
            </div>
            {gameCycles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum ciclo criado ainda.
              </p>
            ) : null}
            <div className="space-y-3">
              {gameCycles.map(
                (cycle: {
                  id: string;
                  name: string;
                  status_name: string;
                  sessions_count: number;
                  total_duration_seconds: number;
                  avg_session_score: number;
                }) => {
                  const sessions = cycle.sessions_count ?? 0;
                  const totalSec = cycle.total_duration_seconds ?? 0;
                  const avg = Number(cycle.avg_session_score) || 0;

                  return (
                    <div
                      key={cycle.id}
                      className="rounded-xl border border-emerald-500/15 bg-card/80 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                            {cycle.name}
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Sessões
                              </p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                                {sessions}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Tempo total
                              </p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                                {formatDuration(totalSec)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Nota média
                              </p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                                {avg > 0 ? avg.toFixed(1) : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] rounded-md",
                              "border border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400",
                            )}
                          >
                            {cycle.status_name}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Excluir ciclo"
                            disabled={deleteCycle.isPending}
                            onClick={() =>
                              setCyclePendingDelete({
                                id: cycle.id,
                                name: cycle.name,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {cycle.status_name?.toLowerCase() !== "finalizado" &&
                        finishedStatusId && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 h-8 w-full text-xs rounded-lg border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300 sm:w-auto"
                            disabled={finishCycle.isPending}
                            onClick={() => finishCycle.mutate(cycle.id)}
                          >
                            Finalizar ciclo
                          </Button>
                        )}
                    </div>
                  );
                },
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>

      <AlertDialog
        open={!!cyclePendingDelete}
        onOpenChange={(o) => !o && setCyclePendingDelete(null)}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ciclo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{cyclePendingDelete?.name}
              &quot;? Esta ação não pode ser desfeita e remove também sessões e
              reviews vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCycle.isPending}
              onClick={() =>
                cyclePendingDelete &&
                deleteCycle.mutate(cyclePendingDelete.id)
              }
            >
              {deleteCycle.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
