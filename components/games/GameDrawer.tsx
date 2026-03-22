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
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Square, RefreshCw, MessageSquare, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DRAWER_SHEET_CONTENT_CLASS } from "@/lib/drawer-sheet";
import { toastSuccess, toastError, getErrorMessage } from "@/lib/toast";

type TabId = "ciclo" | "sessao" | "review";

interface GameDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId?: string;
  gameName?: string;
  activeCycle?: { id: string; name: string };
}

export function GameDrawer({
  open,
  onOpenChange,
  gameId,
  gameName,
  activeCycle,
}: GameDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("ciclo");
  const [newCycleName, setNewCycleName] = useState("");
  const {
    isRunning,
    setIsRunning,
    elapsed,
    reset: resetStopwatch,
    getElapsedSeconds,
  } = useStopwatch();
  const [sessionNote, setSessionNote] = useState("");
  const [sessionScore, setSessionScore] = useState("");
  const [reviewBadge, setReviewBadge] = useState("");
  const [reviewScore, setReviewScore] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewCycle, setReviewCycle] = useState("");

  const supabase = createClient();
  const queryClient = useQueryClient();

  const resetSessionForm = useCallback(() => {
    resetStopwatch();
    setSessionNote("");
    setSessionScore("");
  }, [resetStopwatch]);

  useEffect(() => {
    if (!open) {
      resetSessionForm();
      setReviewBadge("");
      setReviewScore("");
      setReviewText("");
      setReviewCycle("");
    }
  }, [open, resetSessionForm]);

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

  const activeStatusId = statusTypes.find(
    (s: { name: string }) =>
      s.name.toLowerCase() === "ativo" || s.name.toLowerCase() === "jogando"
  )?.id;
  const finishedStatusId = statusTypes.find(
    (s: { name: string }) => s.name.toLowerCase() === "finalizado"
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
    enabled: open,
  });

  const gameStatusJogandoId = gameStatusTypes.find(
    (s: { name: string }) => s.name.toLowerCase() === "jogando"
  )?.id;
  const gameStatusConcluidoId = gameStatusTypes.find(
    (s: { name: string }) => s.name.toLowerCase() === "concluído"
  )?.id;
  const gameStatusRejogandoId = gameStatusTypes.find(
    (s: { name: string }) => s.name.toLowerCase() === "rejogando"
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

  const { data: finishedCycles = [] } = useQuery({
    queryKey: ["cycles_finished", gameId],
    queryFn: async () => {
      if (!gameId) return [];
      const { data: fin } = await supabase
        .from("status_types")
        .select("id")
        .ilike("name", "%finalizado%")
        .single();
      if (!fin?.id) return [];
      const { data, error } = await supabase
        .from("cycles")
        .select("id, name")
        .eq("game_id", gameId)
        .eq("status_type_id", fin.id)
        .order("finished_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!gameId && open,
  });

  const { data: reviewBadges = [] } = useQuery({
    queryKey: ["review_badge_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_badge_types")
        .select("id, name")
        .eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const { data: cyclesWithSessions = [] } = useQuery({
    queryKey: ["cycles_history", gameId],
    queryFn: async () => {
      if (!gameId) return [];
      const { data: cycles, error: ce } = await supabase
        .from("cycles_with_details")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });
      if (ce) throw ce;
      const result: Array<{
        id: string;
        name: string;
        status_name: string;
        sessions: Array<{
          id: string;
          created_at: string;
          duration_seconds: number;
          score: number;
          note: string | null;
        }>;
        review?: { score: number; text: string | null; badge_name: string };
      }> = [];
      for (const c of cycles ?? []) {
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id, created_at, duration_seconds, score, note")
          .eq("cycle_id", c.id)
          .order("created_at");
        const { data: rev } = await supabase
          .from("reviews")
          .select("score, text, review_badge_type_id")
          .eq("cycle_id", c.id)
          .maybeSingle();
        let badgeName = "";
        if (rev?.review_badge_type_id) {
          const { data: bt } = await supabase
            .from("review_badge_types")
            .select("name")
            .eq("id", rev.review_badge_type_id)
            .single();
          badgeName = bt?.name ?? "";
        }
        result.push({
          id: c.id,
          name: c.name,
          status_name: c.status_name,
          sessions: (sessions ?? []).map((s: { id: string; created_at: string; duration_seconds: number; score: number; note: string | null }) => ({
            id: s.id,
            created_at: s.created_at,
            duration_seconds: s.duration_seconds,
            score: s.score,
            note: s.note,
          })),
          review: rev
            ? { score: rev.score, text: rev.text, badge_name: badgeName }
            : undefined,
        });
      }
      return result;
    },
    enabled: !!gameId && open,
  });

  const createCycle = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id || !gameId || !activeStatusId) throw new Error("Dados incompletos");
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
        currentStatusName === "concluído" ? gameStatusRejogandoId : gameStatusJogandoId;
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
      queryClient.invalidateQueries({ queryKey: ["cycles_active_by_game"] });
      setNewCycleName("");
    },
  });

  const finishCycle = useMutation({
    mutationFn: async (cycleId: string) => {
      if (!finishedStatusId || !gameStatusConcluidoId) throw new Error("Status não encontrado");
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
      queryClient.invalidateQueries({ queryKey: ["cycles_active_by_game"] });
      queryClient.invalidateQueries({ queryKey: ["cycles_finished", gameId] });
      queryClient.invalidateQueries({ queryKey: ["cycles_history", gameId] });
      toastSuccess("Ciclo finalizado");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const saveSession = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const cycleId = activeCycle?.id;
      if (!user.user?.id || !cycleId || !gameId) throw new Error("Dados incompletos");
      const scoreNum = parseFloat(sessionScore) || 0;
      const { error } = await supabase.from("sessions").insert({
        cycle_id: cycleId,
        game_id: gameId,
        user_id: user.user.id,
        duration_seconds: getElapsedSeconds(),
        note: sessionNote.trim() || null,
        score: scoreNum,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["cycles_with_details"] });
      queryClient.invalidateQueries({ queryKey: ["cycles_history", gameId] });
      resetSessionForm();
      toastSuccess("Sessão salva");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const saveReview = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id || !gameId || !reviewCycle || !reviewBadge)
        throw new Error("Dados incompletos");
      const scoreNum = parseFloat(reviewScore) || 0;
      const { error } = await supabase.from("reviews").insert({
        cycle_id: reviewCycle,
        game_id: gameId,
        user_id: user.user.id,
        score: scoreNum,
        text: reviewText.trim() || null,
        review_badge_type_id: reviewBadge,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["cycles_history", gameId] });
      setReviewBadge("");
      setReviewScore("");
      setReviewText("");
      setReviewCycle("");
      toastSuccess("Review publicada");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const cycleIdForSession = activeCycle?.id;
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "ciclo", label: "Ciclo", icon: <RefreshCw className="h-3.5 w-3.5" /> },
    { id: "sessao", label: "Sessão", icon: <Play className="h-3.5 w-3.5" /> },
    { id: "review", label: "Review", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={DRAWER_SHEET_CONTENT_CLASS}>
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-base font-semibold">
            {gameName ?? "Jogo"}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Ciclo · Sessão · Review
          </p>
        </SheetHeader>

        <div className="flex border-b border-border px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors -mb-px",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "ciclo" && (
            <div className="space-y-5">
              <div className="flex gap-2">
                <Input
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder="Nome do novo ciclo"
                  className="text-sm rounded-md"
                />
                <Button
                  size="sm"
                  className="rounded-md shrink-0"
                  disabled={!newCycleName.trim() || createCycle.isPending}
                  onClick={() => createCycle.mutate()}
                >
                  <Plus className="mr-1 h-3 w-3" /> Criar
                </Button>
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-foreground">Ciclos</Label>
                {gameCycles.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum ciclo criado.</p>
                )}
                {gameCycles.map((cycle: {
                  id: string;
                  name: string;
                  status_name: string;
                  sessions_count: number;
                  total_duration_seconds: number;
                  avg_session_score: number;
                }) => {
                  const totalSec = cycle.total_duration_seconds ?? 0;
                  const h = Math.floor(totalSec / 3600);
                  const m = Math.floor((totalSec % 3600) / 60);
                  const timeStr = h > 0 ? `${h}h ${m}min` : `${m}min`;
                  return (
                    <div
                      key={cycle.id}
                      className="rounded-md border border-border bg-card p-4 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight">{cycle.name}</p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "shrink-0 text-[11px] rounded-md font-medium",
                            cycle.status_name?.toLowerCase() === "finalizado" &&
                              "bg-green-500/10 text-green-600 dark:text-green-400",
                            (cycle.status_name?.toLowerCase() === "ativo" ||
                              cycle.status_name?.toLowerCase() === "jogando") &&
                              "bg-primary/10 text-primary"
                          )}
                        >
                          {cycle.status_name}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-md bg-muted/60 px-2 py-1.5">
                          <span className="text-muted-foreground block">Sessões</span>
                          <span className="font-semibold tabular-nums">{cycle.sessions_count}</span>
                        </div>
                        <div className="rounded-md bg-muted/60 px-2 py-1.5">
                          <span className="text-muted-foreground block">Tempo total</span>
                          <span className="font-semibold tabular-nums">{timeStr}</span>
                        </div>
                        <div className="rounded-md bg-muted/60 px-2 py-1.5">
                          <span className="text-muted-foreground block">Média</span>
                          <span className="font-semibold tabular-nums text-primary">
                            {(cycle.avg_session_score ?? 0) > 0
                              ? cycle.avg_session_score.toFixed(1)
                              : "—"}
                          </span>
                        </div>
                      </div>
                      {cycle.status_name?.toLowerCase() !== "finalizado" && finishedStatusId && (
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full rounded-md font-medium"
                          disabled={finishCycle.isPending}
                          onClick={() => finishCycle.mutate(cycle.id)}
                        >
                          {finishCycle.isPending ? "Finalizando…" : "Finalizar ciclo"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "sessao" && (
            <div className="space-y-6">
              {!cycleIdForSession ? (
                <p className="text-sm text-muted-foreground">
                  Crie ou selecione um ciclo ativo (aba Ciclo) para registrar sessões.
                </p>
              ) : (
                <>
                  <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
                    <Label className="text-xs font-medium text-muted-foreground">Ciclo atual</Label>
                    <p className="mt-0.5 text-sm font-semibold">{activeCycle?.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cronômetro</Label>
                    <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-card p-6">
                      <div className="font-mono text-4xl font-bold tabular-nums text-primary tracking-tight">
                        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
                      </div>
                      <Button
                        onClick={() => setIsRunning(!isRunning)}
                        variant={isRunning ? "destructive" : "default"}
                        size="sm"
                        className="w-36 rounded-md font-medium"
                      >
                        {isRunning ? (
                          <><Square className="mr-2 h-3 w-3" /> Parar</>
                        ) : (
                          <><Play className="mr-2 h-3 w-3" /> Iniciar</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Nota da sessão</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={sessionScore}
                      onChange={(e) => setSessionScore(e.target.value)}
                      placeholder="Ex.: 8.5"
                      className="w-24 font-mono rounded-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Resumo da sessão</Label>
                    <Textarea
                      value={sessionNote}
                      onChange={(e) => setSessionNote(e.target.value)}
                      placeholder="O que você sentiu nessa sessão?"
                      className="min-h-[100px] resize-none text-sm rounded-md"
                    />
                  </div>
                  <Button
                    className="w-full rounded-md font-medium"
                    disabled={elapsed === 0 || saveSession.isPending}
                    onClick={() => saveSession.mutate()}
                  >
                    {saveSession.isPending ? "Salvando…" : "Salvar sessão"}
                  </Button>
                </>
              )}
            </div>
          )}

          {activeTab === "review" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ciclo finalizado (selecione para avaliar)</Label>
                {finishedCycles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum ciclo finalizado. Finalize um ciclo na aba Ciclo.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {finishedCycles.map((cycle: { id: string; name: string }) => (
                      <button
                        key={cycle.id}
                        type="button"
                        onClick={() => setReviewCycle(cycle.id)}
                        className={cn(
                          "w-full rounded-md border-2 px-4 py-3 text-left text-sm font-medium transition-colors",
                          reviewCycle === cycle.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-accent/50"
                        )}
                      >
                        {cycle.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Badge</Label>
                <div className="flex flex-wrap gap-2">
                  {reviewBadges.map((badge: { id: string; name: string }) => (
                    <button
                      key={badge.id}
                      type="button"
                      onClick={() => setReviewBadge(badge.id)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                        reviewBadge === badge.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {badge.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nota final</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={reviewScore}
                  onChange={(e) => setReviewScore(e.target.value)}
                  placeholder="9.0"
                  className="w-24 font-mono rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Review (impressões finais)</Label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Suas impressões finais sobre o jogo..."
                  className="min-h-[120px] resize-none text-sm rounded-md"
                />
              </div>
              <Button
                className="w-full rounded-md font-medium"
                disabled={
                  !reviewCycle ||
                  !reviewBadge ||
                  !reviewScore ||
                  saveReview.isPending
                }
                onClick={() => saveReview.mutate()}
              >
                {saveReview.isPending ? "Salvando…" : "Salvar Review"}
              </Button>
            </div>
          )}

          {(activeTab === "ciclo" || activeTab === "sessao") && (
            <div className="mt-8 border-t border-border pt-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Histórico</Label>
              </div>
              {cyclesWithSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum ciclo ou sessão ainda.</p>
              ) : (
                <div className="space-y-6">
                  {cyclesWithSessions.map((cycle: {
                    id: string;
                    name: string;
                    status_name: string;
                    sessions: Array<{
                      id: string;
                      created_at: string;
                      duration_seconds: number;
                      score: number;
                      note: string | null;
                    }>;
                    review?: { score: number; text: string | null; badge_name: string };
                  }) => (
                    <div key={cycle.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{cycle.name}</p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] rounded-md font-medium",
                            cycle.status_name?.toLowerCase() === "finalizado"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {cycle.status_name}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {cycle.sessions.map((session: {
                          id: string;
                          created_at: string;
                          duration_seconds: number;
                          score: number;
                          note: string | null;
                        }) => (
                          <div
                            key={session.id}
                            className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 rounded-md border border-border bg-card px-3 py-2.5 text-sm"
                          >
                            <span className="font-medium tabular-nums text-muted-foreground">
                              {new Date(session.created_at).toLocaleDateString("pt-BR")}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {formatDuration(session.duration_seconds)}
                            </span>
                            <span className="font-semibold tabular-nums text-primary">
                              {session.score.toFixed(1)}
                            </span>
                            <p
                              className="col-span-3 min-h-[1.25rem] break-words text-xs text-muted-foreground leading-relaxed line-clamp-4"
                              title={session.note || undefined}
                            >
                              {session.note || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                      {cycle.review && (
                        <div className="rounded-md border border-border bg-muted/50 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Review</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="secondary" className="text-[10px] rounded-md">
                                {cycle.review.badge_name}
                              </Badge>
                              <span className="text-sm font-semibold tabular-nums text-primary">
                                {cycle.review.score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <p className="break-words text-sm text-foreground/90 leading-relaxed line-clamp-4">
                            {cycle.review.text || "—"}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
