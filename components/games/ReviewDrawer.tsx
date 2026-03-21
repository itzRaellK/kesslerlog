"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { History, Pencil, Play, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import { DrawerGameHeader } from "@/components/games/DrawerGameHeader";
import { toastSuccess, toastError, getErrorMessage } from "@/lib/toast";

interface ReviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId?: string;
  gameName?: string;
  onReviewSaved?: (payload: { gameId?: string }) => void;
}

type ReviewTab = "nova" | "historico";

type CycleForReview = {
  id: string;
  name: string;
  status_name: string;
  created_at: string;
  sessions_count: number;
  total_duration_seconds: number;
  avg_session_score: number;
};

type ReviewHistoryRow = {
  id: string;
  cycle_id: string;
  score: number;
  text: string | null;
  created_at: string;
  review_badge_type_id: string;
  cycles: { name: string; created_at: string } | null;
  review_badge_types: { name: string } | null;
};

function formatCycleShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatReviewWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReviewDrawer({
  open,
  onOpenChange,
  gameId,
  gameName,
  onReviewSaved,
}: ReviewDrawerProps) {
  const [activeTab, setActiveTab] = useState<ReviewTab>("nova");
  const [selectedBadge, setSelectedBadge] = useState("");
  const [score, setScore] = useState("");
  const [text, setText] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("");

  const [historyReviewId, setHistoryReviewId] = useState("");
  const [editingReview, setEditingReview] = useState<ReviewHistoryRow | null>(
    null,
  );
  const [editBadge, setEditBadge] = useState("");
  const [editScore, setEditScore] = useState("");
  const [editText, setEditText] = useState("");
  const [reviewIdToDelete, setReviewIdToDelete] = useState<string | null>(null);

  const supabase = createClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) setActiveTab("nova");
  }, [open]);

  const { data: gameCycles = [], isPending: cyclesLoading } = useQuery({
    queryKey: ["cycles_all_for_review", gameId],
    queryFn: async () => {
      if (!gameId) return [];
      const { data, error } = await supabase
        .from("cycles_with_details")
        .select(
          "id, name, status_name, created_at, sessions_count, total_duration_seconds, avg_session_score",
        )
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CycleForReview[];
    },
    enabled: !!gameId && open,
  });

  const selectedCycleMeta = useMemo(
    () => gameCycles.find((c) => c.id === selectedCycle) ?? null,
    [gameCycles, selectedCycle],
  );

  const isCycleFinished =
    selectedCycleMeta?.status_name?.toLowerCase() === "finalizado";

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
    enabled: open,
  });

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
    enabled: open,
  });

  const finishedStatusId = statusTypes.find(
    (s: { name: string }) => s.name.toLowerCase() === "finalizado",
  )?.id;
  const gameStatusConcluidoId = gameStatusTypes.find(
    (s: { name: string }) => s.name.toLowerCase() === "concluído",
  )?.id;

  /** Ciclo aberto mas sem IDs de status no banco: não dá para finalizar nem ao salvar. */
  const cannotAutoFinishCycle =
    !!selectedCycleMeta &&
    !isCycleFinished &&
    (!finishedStatusId || !gameStatusConcluidoId);

  const invalidateCyclesAfterFinish = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["cycles_all_for_review", gameId],
    });
    queryClient.invalidateQueries({ queryKey: ["cycles"] });
    queryClient.invalidateQueries({ queryKey: ["cycles_with_details"] });
    queryClient.invalidateQueries({ queryKey: ["games"] });
    queryClient.invalidateQueries({
      queryKey: ["cycles_active_by_game_queue"],
    });
    queryClient.invalidateQueries({
      queryKey: ["cycles_finished_by_game_queue"],
    });
    queryClient.invalidateQueries({
      queryKey: ["cycles_active_for_session", gameId],
    });
  }, [queryClient, gameId]);

  useEffect(() => {
    if (!open || gameCycles.length === 0) {
      setSelectedCycle("");
      return;
    }
    const stillValid =
      selectedCycle && gameCycles.some((c) => c.id === selectedCycle);
    if (stillValid) return;
    const firstFinished = gameCycles.find(
      (c) => c.status_name?.toLowerCase() === "finalizado",
    );
    setSelectedCycle(firstFinished?.id ?? gameCycles[0].id);
  }, [open, gameCycles, selectedCycle]);

  const { data: activeBadges = [] } = useQuery({
    queryKey: ["review_badge_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_badge_types")
        .select("id, name")
        .eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reviewsHistory = [], isPending: reviewsLoading } = useQuery({
    queryKey: ["reviews_history_game", gameId],
    queryFn: async () => {
      if (!gameId) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          id,
          cycle_id,
          score,
          text,
          created_at,
          review_badge_type_id,
          cycles ( name, created_at ),
          review_badge_types ( name )
        `,
        )
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReviewHistoryRow[];
    },
    enabled: !!gameId && open,
  });

  const reviewsForSelectedCycle = useMemo(
    () =>
      selectedCycle
        ? reviewsHistory.filter((r) => r.cycle_id === selectedCycle)
        : [],
    [reviewsHistory, selectedCycle],
  );

  const selectedHistoryReview = useMemo(
    () => reviewsForSelectedCycle.find((r) => r.id === historyReviewId) ?? null,
    [reviewsForSelectedCycle, historyReviewId],
  );

  useEffect(() => {
    if (!open) return;
    if (reviewsForSelectedCycle.length === 0) {
      setHistoryReviewId("");
      return;
    }
    const ok =
      historyReviewId &&
      reviewsForSelectedCycle.some((r) => r.id === historyReviewId);
    if (ok) return;
    setHistoryReviewId(reviewsForSelectedCycle[0].id);
  }, [open, reviewsForSelectedCycle, historyReviewId]);

  const invalidateReviews = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
    queryClient.invalidateQueries({
      queryKey: ["reviews_history_game", gameId],
    });
  }, [queryClient, gameId]);

  const saveReview = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id || !gameId || !selectedCycle || !selectedBadge)
        throw new Error("Dados incompletos");
      const scoreNum = parseFloat(score) || 0;

      const cycleOpen =
        selectedCycleMeta?.status_name?.toLowerCase() !== "finalizado";
      if (cycleOpen) {
        if (!finishedStatusId || !gameStatusConcluidoId) {
          throw new Error(
            "Não foi possível finalizar o ciclo automaticamente. Verifique os status no sistema ou finalize o ciclo manualmente acima.",
          );
        }
        const { error: cycleErr } = await supabase
          .from("cycles")
          .update({
            status_type_id: finishedStatusId,
            finished_at: new Date().toISOString(),
          })
          .eq("id", selectedCycle);
        if (cycleErr) throw cycleErr;
        const { error: gameErr } = await supabase
          .from("games")
          .update({ game_status_type_id: gameStatusConcluidoId })
          .eq("id", gameId);
        if (gameErr) throw gameErr;
      }

      const { error } = await supabase.from("reviews").insert({
        cycle_id: selectedCycle,
        game_id: gameId,
        user_id: user.user.id,
        score: scoreNum,
        text: text.trim() || null,
        review_badge_type_id: selectedBadge,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateReviews();
      invalidateCyclesAfterFinish();
      setSelectedBadge("");
      setScore("");
      setText("");
      setSelectedCycle("");
      onReviewSaved?.({ gameId });
      onOpenChange(false);
      toastSuccess("Review publicada");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const updateReview = useMutation({
    mutationFn: async (payload: {
      id: string;
      score: number;
      text: string | null;
      review_badge_type_id: string;
    }) => {
      const { error } = await supabase
        .from("reviews")
        .update({
          score: payload.score,
          text: payload.text,
          review_badge_type_id: payload.review_badge_type_id,
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateReviews();
      setEditingReview(null);
      toastSuccess("Review atualizada");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateReviews();
      setReviewIdToDelete(null);
      setHistoryReviewId("");
      toastSuccess("Review excluída");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const openEditReview = (r: ReviewHistoryRow) => {
    setEditingReview(r);
    setEditBadge(r.review_badge_type_id);
    setEditScore(String(r.score ?? ""));
    setEditText(r.text ?? "");
  };

  const submitEditReview = () => {
    if (!editingReview || !editBadge) return;
    const n = parseFloat(editScore.replace(",", "."));
    if (Number.isNaN(n)) {
      toastError("Nota inválida");
      return;
    }
    updateReview.mutate({
      id: editingReview.id,
      score: n,
      text: editText.trim() || null,
      review_badge_type_id: editBadge,
    });
  };

  const cycleNameDisplay = selectedCycleMeta?.name ?? "";

  const tabNav = (
    <div className="flex shrink-0 border-b border-border">
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
        Nova review
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
        <SheetContent
          side="right"
          className="flex h-full w-[min(100vw,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]"
        >
          <SheetHeader className="space-y-0 border-b border-border px-6 pb-4 pt-6 text-left">
            <SheetTitle className="sr-only">Review</SheetTitle>
            <DrawerGameHeader label="Review" gameName={gameName} />
          </SheetHeader>

          {/* Faixa fixa: ciclo (igual ao drawer Sessão — mais recente primeiro) */}
          <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-4">
            <Label
              htmlFor="review-cycle-select"
              className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Ciclo da review
            </Label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Selecione o ciclo que você deseja fazer a review.
            </p>

            {cyclesLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Carregando ciclos…
              </p>
            ) : gameCycles.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum ciclo criado. Use o drawer <b>Ciclo</b> para criar um.
              </p>
            ) : (
              <>
                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger
                    id="review-cycle-select"
                    className="mt-3 h-auto min-h-10 w-full rounded-lg border-emerald-500/30 bg-background py-2 text-left [&>span]:line-clamp-none"
                  >
                    <SelectValue placeholder="Selecione um ciclo">
                      {cycleNameDisplay ? (
                        <span className="line-clamp-2 text-left font-medium">
                          {cycleNameDisplay}
                        </span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="max-h-[min(70vh,320px)] w-[var(--radix-select-trigger-width)] rounded-lg"
                  >
                    {gameCycles.map((c) => (
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
                            {c.status_name} · {c.sessions_count ?? 0} sessões
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {tabNav}

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {activeTab === "nova" && (
              <div className="space-y-6">
                {cannotAutoFinishCycle ? (
                  <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                    Não é possível finalizar o ciclo ao salvar (status
                    incompleto no sistema). Ajuste a configuração de status.
                  </p>
                ) : null}

                <section className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Badge de final de jogo
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Como você classifica esta experiência completa?
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeBadges.map((badge: { id: string; name: string }) => (
                      <button
                        key={badge.id}
                        type="button"
                        onClick={() => setSelectedBadge(badge.id)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                          selectedBadge === badge.id
                            ? "border-emerald-500/55 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                            : "border-border/80 text-muted-foreground hover:border-emerald-500/35 hover:bg-emerald-500/5 hover:text-foreground",
                        )}
                      >
                        {badge.name}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      Nota da review
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder="9.0"
                      className="h-10 max-w-[120px] rounded-lg border-emerald-500/30 font-mono-nums focus-visible:ring-emerald-500/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Resumo</Label>
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Suas impressões finais sobre o ciclo…"
                      className="min-h-[140px] resize-none rounded-lg border-border/80 text-sm"
                    />
                  </div>

                  <Button
                    variant="outline"
                    type="button"
                    className="h-11 w-full rounded-lg border-emerald-500/45 text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300"
                    disabled={
                      !selectedCycle ||
                      !selectedBadge ||
                      !score ||
                      saveReview.isPending ||
                      cannotAutoFinishCycle
                    }
                    onClick={() => saveReview.mutate()}
                  >
                    {saveReview.isPending ? "Salvando…" : "Salvar review"}
                  </Button>
                </section>
              </div>
            )}

            {activeTab === "historico" && (
              <div className="space-y-4">
                {!selectedCycle ? (
                  <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    Escolha um ciclo na faixa superior para ver o histórico.
                  </p>
                ) : (
                  <>
                    {selectedCycleMeta ? (
                      <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                              {selectedCycleMeta.name}
                            </p>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "mt-2 text-[10px]",
                                isCycleFinished
                                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300",
                              )}
                            >
                              {selectedCycleMeta.status_name}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Sessões
                            </p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums">
                              {selectedCycleMeta.sessions_count ?? 0}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Tempo total
                            </p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                              {formatDuration(
                                selectedCycleMeta.total_duration_seconds ?? 0,
                              )}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Média das sessões
                            </p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums">
                              {Number(selectedCycleMeta.avg_session_score) > 0
                                ? Number(
                                    selectedCycleMeta.avg_session_score,
                                  ).toFixed(1)
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {reviewsLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Carregando histórico…
                      </p>
                    ) : reviewsForSelectedCycle.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        Nenhuma review publicada para este ciclo ainda. Use a
                        aba <b>Nova review</b> para publicar.
                      </p>
                    ) : (
                      <>
                        {reviewsForSelectedCycle.length > 1 ? (
                          <div className="space-y-2">
                            <Label
                              htmlFor="review-history-select"
                              className="text-xs font-medium"
                            >
                              Review neste ciclo
                            </Label>
                            <Select
                              value={historyReviewId}
                              onValueChange={setHistoryReviewId}
                            >
                              <SelectTrigger
                                id="review-history-select"
                                className="h-auto min-h-10 w-full rounded-lg border-emerald-500/30 py-2 text-left [&>span]:line-clamp-none"
                              >
                                <SelectValue placeholder="Selecione uma review">
                                  {selectedHistoryReview ? (
                                    <span className="line-clamp-2 text-left text-sm">
                                      {formatReviewWhen(
                                        selectedHistoryReview.created_at,
                                      )}{" "}
                                      · nota{" "}
                                      {Number(
                                        selectedHistoryReview.score,
                                      ).toFixed(1)}
                                    </span>
                                  ) : null}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent
                                position="popper"
                                className="max-h-[min(70vh,320px)] w-[var(--radix-select-trigger-width)] rounded-lg"
                              >
                                {reviewsForSelectedCycle.map((r) => (
                                  <SelectItem
                                    key={r.id}
                                    value={r.id}
                                    className="cursor-pointer py-2.5 pl-8 pr-2"
                                  >
                                    <span className="flex flex-col gap-0.5 text-left">
                                      <span className="line-clamp-2 font-medium leading-snug">
                                        {formatReviewWhen(r.created_at)}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground">
                                        nota {Number(r.score).toFixed(1)} ·{" "}
                                        {r.review_badge_types?.name ?? "—"}
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}

                        {selectedHistoryReview ? (
                          <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
                            <div>
                              <p className="text-[10px] font-medium uppercase text-muted-foreground">
                                Ciclo
                              </p>
                              <p className="text-sm font-semibold leading-snug">
                                {selectedHistoryReview.cycles?.name ?? "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium uppercase text-muted-foreground">
                                Publicada em
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatReviewWhen(
                                  selectedHistoryReview.created_at,
                                )}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <div>
                                <p className="text-[10px] uppercase text-muted-foreground">
                                  Nota
                                </p>
                                <p className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                                  {Number(selectedHistoryReview.score).toFixed(
                                    1,
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase text-muted-foreground">
                                  Badge
                                </p>
                                <Badge
                                  variant="secondary"
                                  className="mt-0.5 border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
                                >
                                  {selectedHistoryReview.review_badge_types
                                    ?.name ?? "—"}
                                </Badge>
                              </div>
                            </div>
                            {(selectedHistoryReview.text ?? "").trim() !==
                              "" && (
                              <div>
                                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                                  Resumo
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                  {selectedHistoryReview.text}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-lg"
                                onClick={() =>
                                  openEditReview(selectedHistoryReview)
                                }
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  setReviewIdToDelete(selectedHistoryReview.id)
                                }
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Excluir
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!editingReview}
        onOpenChange={(o) => !o && setEditingReview(null)}
      >
        <DialogContent className="rounded-xl sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base">Editar review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              {editingReview?.cycles?.name}
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Badge</Label>
              <div className="flex flex-wrap gap-2">
                {activeBadges.map((badge: { id: string; name: string }) => (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setEditBadge(badge.id)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium",
                      editBadge === badge.id
                        ? "border-emerald-500/55 bg-emerald-500/15"
                        : "border-border/80 text-muted-foreground hover:border-emerald-500/35",
                    )}
                  >
                    {badge.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nota</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={editScore}
                onChange={(e) => setEditScore(e.target.value)}
                className="h-10 max-w-[120px] rounded-lg font-mono-nums"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Resumo</Label>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[120px] resize-none rounded-lg text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => setEditingReview(null)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700"
              disabled={updateReview.isPending || !editBadge}
              onClick={submitEditReview}
            >
              {updateReview.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!reviewIdToDelete}
        onOpenChange={(o) => !o && setReviewIdToDelete(null)}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir review</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A review será removida
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteReview.isPending}
              onClick={() =>
                reviewIdToDelete && deleteReview.mutate(reviewIdToDelete)
              }
            >
              {deleteReview.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
