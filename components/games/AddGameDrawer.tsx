"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Search, Gamepad2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { DRAWER_SHEET_CONTENT_CLASS } from "@/lib/drawer-sheet";
import { DrawerGameHeader } from "@/components/games/DrawerGameHeader";
import { GenreMultiSelectInput } from "@/components/games/GenreMultiSelectInput";
import type { GenreRow } from "@/lib/game-genres";
import { syncGameGenresForGame } from "@/lib/game-genres";
import { toastSuccess, toastError, getErrorMessage } from "@/lib/toast";
import { stripHtml } from "@/lib/rawg/strip-html";
import { importRawgGameToSupabase } from "@/lib/rawg/import-from-rawg";
import type { RawgGameDetail, RawgSearchResult } from "@/lib/rawg/types";
import { cn } from "@/lib/utils";

export type GameToEdit = {
  id: string;
  title: string;
  image_url: string | null;
  genre_type_id: string | null;
  /** ids em `game_genres` (view `games_with_details.genre_type_ids`). */
  genre_type_ids?: string[] | null;
  externalScores: { source: string; score: string }[];
  description?: string | null;
  background_image_url?: string | null;
};

interface AddGameDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGame?: GameToEdit | null;
}

export function AddGameDrawer({
  open,
  onOpenChange,
  editingGame,
}: AddGameDrawerProps) {
  const [title, setTitle] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<GenreRow[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [externalScores, setExternalScores] = useState<
    { source: string; score: string }[]
  >([]);

  const [rawgQuery, setRawgQuery] = useState("");
  const [rawgResults, setRawgResults] = useState<RawgSearchResult[]>([]);
  const [rawgSearchLoading, setRawgSearchLoading] = useState(false);
  const [rawgDetail, setRawgDetail] = useState<RawgGameDetail | null>(null);
  const [rawgDetailLoading, setRawgDetailLoading] = useState(false);
  /** Evita aplicar detalhe de um jogo quando o usuário clicou em outro antes da resposta. */
  const rawgDetailRequestId = useRef(0);
  /** Evita reaplicar gêneros do prop ao cada refetch de `genre_types` (sobrescrevia a edição). */
  const editingGenresSnapshotKeyRef = useRef<string | null>(null);
  const prevOpenRef = useRef(false);

  const supabase = createClient();
  const queryClient = useQueryClient();
  const isEdit = !!editingGame?.id;

  const { data: genres = [] } = useQuery({
    queryKey: ["genre_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genre_types")
        .select("id, name, rawg_id")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as (GenreRow & { rawg_id: number | null })[];
    },
  });

  useEffect(() => {
    if (open && editingGame) {
      setTitle(editingGame.title);
      setImageUrl(editingGame.image_url ?? "");
      setBackgroundImageUrl(editingGame.background_image_url ?? "");
      setDescription(editingGame.description ?? "");
      setExternalScores(
        editingGame.externalScores.length > 0
          ? editingGame.externalScores.map((es) => ({
              source: es.source,
              score: String(es.score),
            }))
          : [{ source: "", score: "" }],
      );
      setRawgQuery("");
      setRawgResults([]);
      setRawgDetail(null);
    }
    if (open && !editingGame) {
      setTitle("");
      setImageUrl("");
      setBackgroundImageUrl("");
      setDescription("");
      setExternalScores([]);
      setRawgQuery("");
      setRawgResults([]);
      setRawgDetail(null);
    }
  }, [open, editingGame]);

  /** Só dos gêneros vindos do jogo em edição (muda ao reabrir / após salvar com dados novos). */
  const editingGenreSnapshotKey = useMemo(() => {
    if (!editingGame) return null;
    const ids =
      editingGame.genre_type_ids?.length &&
      editingGame.genre_type_ids.length > 0
        ? editingGame.genre_type_ids
        : editingGame.genre_type_id
          ? [editingGame.genre_type_id]
          : [];
    return `${editingGame.id}:${[...ids].sort().join(",")}`;
  }, [editingGame]);

  /** Novo cadastro: limpar gêneros só ao abrir o sheet (não a cada refetch de `genre_types`). */
  useEffect(() => {
    if (open && !prevOpenRef.current && !editingGame) {
      setSelectedGenres([]);
    }
    prevOpenRef.current = open;
  }, [open, editingGame]);

  /** Edição: hidratar multiselect a partir do jogo; não resetar quando só `genres` refetchar. */
  useEffect(() => {
    if (!open || !editingGame || editingGenreSnapshotKey === null) {
      if (!open) editingGenresSnapshotKeyRef.current = null;
      return;
    }
    const ids =
      editingGame.genre_type_ids?.length &&
      editingGame.genre_type_ids.length > 0
        ? editingGame.genre_type_ids
        : editingGame.genre_type_id
          ? [editingGame.genre_type_id]
          : [];

    const snapshotKey = editingGenreSnapshotKey;
    const resolved = ids
      .map((id) => {
        const g = genres.find((x) => x.id === id);
        return g ? { id: g.id, name: g.name } : null;
      })
      .filter((x): x is GenreRow => x != null);

    if (editingGenresSnapshotKeyRef.current !== snapshotKey) {
      editingGenresSnapshotKeyRef.current = snapshotKey;
      setSelectedGenres(resolved);
      return;
    }

    setSelectedGenres((prev) => {
      const targetSorted = [...ids].sort().join(",");
      const prevSorted = [...prev].map((p) => p.id).sort().join(",");
      if (prevSorted === targetSorted && resolved.length === ids.length) {
        return resolved;
      }
      if (prev.length === 0 && resolved.length > 0 && ids.length > 0) {
        return resolved;
      }
      return prev;
    });
  }, [open, editingGame, editingGenreSnapshotKey, genres]);

  useEffect(() => {
    if (isEdit || rawgQuery.trim().length < 2) {
      setRawgResults([]);
      setRawgSearchLoading(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      (async () => {
        setRawgSearchLoading(true);
        try {
          const r = await fetch(
            `/api/rawg/search?q=${encodeURIComponent(rawgQuery.trim())}`,
          );
          const j = (await r.json()) as {
            error?: string;
            results?: RawgSearchResult[];
          };
          if (!r.ok) throw new Error(j.error ?? "Falha na busca");
          if (!cancelled) setRawgResults(j.results ?? []);
        } catch {
          if (!cancelled) setRawgResults([]);
        } finally {
          if (!cancelled) setRawgSearchLoading(false);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [rawgQuery, isEdit]);

  const applyRawgDetail = useCallback(
    (d: RawgGameDetail) => {
      setRawgDetail(d);
      setTitle(d.name);
      /** Capa manual — não preenchemos com artes largas da API. */
      setImageUrl("");
      setBackgroundImageUrl(d.background_image?.trim() || "");
      setDescription(stripHtml(d.description_raw ?? ""));
      if (d.metacritic != null) {
        setExternalScores([
          { source: "Metacritic", score: String(d.metacritic) },
        ]);
      } else {
        setExternalScores([]);
      }
      const matched: GenreRow[] = [];
      for (const g0 of d.genres ?? []) {
        const match =
          genres.find((x) => x.rawg_id != null && x.rawg_id === g0.id) ??
          genres.find(
            (x) => x.name.toLowerCase() === g0.name.toLowerCase(),
          );
        if (match && !matched.some((m) => m.id === match.id)) {
          matched.push({ id: match.id, name: match.name });
        }
      }
      setSelectedGenres(matched);
      setRawgQuery("");
      setRawgResults([]);
      toastSuccess(
        "Dados da RAWG carregados — cole a URL da capa se quiser e salve.",
      );
    },
    [genres],
  );

  const pickRawgResult = async (id: number) => {
    const reqId = ++rawgDetailRequestId.current;
    setRawgDetailLoading(true);
    try {
      const r = await fetch(`/api/rawg/games/${id}`);
      const j = (await r.json()) as { error?: string } & RawgGameDetail;
      if (reqId !== rawgDetailRequestId.current) return;
      if (!r.ok)
        throw new Error(j.error ?? "Não foi possível carregar o jogo.");
      applyRawgDetail(j);
    } catch (e) {
      if (reqId !== rawgDetailRequestId.current) return;
      toastError(getErrorMessage(e));
    } finally {
      if (reqId === rawgDetailRequestId.current) setRawgDetailLoading(false);
    }
  };

  const insertGame = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error("Não autenticado");
      const { data: notStarted } = await supabase
        .from("game_status_types")
        .select("id")
        .ilike("name", "Não iniciado")
        .maybeSingle();

      const scoreRows = externalScores
        .filter((es) => es.source.trim() && es.score)
        .map((es) => ({
          source: es.source.trim(),
          score: parseFloat(es.score) || 0,
        }));

      if (rawgDetail) {
        try {
          await importRawgGameToSupabase(supabase, {
            userId: user.user.id,
            detail: rawgDetail,
            title: title.trim(),
            imageUrl: imageUrl.trim() || null,
            backgroundImageUrl: backgroundImageUrl.trim() || null,
            description,
            gameStatusTypeId: notStarted?.id ?? null,
            externalScores: scoreRows,
            genreTypeIds: selectedGenres.map((g) => g.id),
          });
        } catch (e: unknown) {
          const err = e as { code?: string; message?: string };
          if (err.code === "23505") {
            throw new Error(
              "Este jogo já está na sua biblioteca (mesmo ID RAWG).",
            );
          }
          throw e;
        }
        return;
      }

      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert({
          user_id: user.user.id,
          title: title.trim(),
          genre_type_id: selectedGenres[0]?.id ?? null,
          game_status_type_id: notStarted?.id ?? null,
          image_url: imageUrl.trim() || null,
          background_image_url: backgroundImageUrl.trim() || null,
          description: description.trim() || null,
        })
        .select("id")
        .single();
      if (gameError) throw gameError;
      if (game?.id) {
        await syncGameGenresForGame(supabase, game.id, selectedGenres);
      }
      if (game && scoreRows.length) {
        await supabase
          .from("game_external_scores")
          .insert(scoreRows.map((r) => ({ ...r, game_id: game.id })));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["games"] });
      await queryClient.invalidateQueries({ queryKey: ["games_with_details"] });
      await queryClient.invalidateQueries({ queryKey: ["game_external_scores"] });
      await queryClient.invalidateQueries({ queryKey: ["genre_types"] });
      await queryClient.refetchQueries({ queryKey: ["games_with_details"] });
      resetAndClose();
      toastSuccess("Jogo adicionado");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const updateGame = useMutation({
    mutationFn: async () => {
      if (!editingGame?.id) return;
      const { error: gameError } = await supabase
        .from("games")
        .update({
          title: title.trim(),
          image_url: imageUrl.trim() || null,
          background_image_url: backgroundImageUrl.trim() || null,
          description: description.trim() || null,
        })
        .eq("id", editingGame.id);
      if (gameError) throw gameError;
      await syncGameGenresForGame(supabase, editingGame.id, selectedGenres);
      await supabase
        .from("game_external_scores")
        .delete()
        .eq("game_id", editingGame.id);
      const rows = externalScores
        .filter((es) => es.source.trim() && es.score)
        .map((es) => ({
          game_id: editingGame.id,
          source: es.source.trim(),
          score: parseFloat(es.score) || 0,
        }));
      if (rows.length) {
        await supabase.from("game_external_scores").insert(rows);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["games"] });
      await queryClient.invalidateQueries({ queryKey: ["games_with_details"] });
      await queryClient.invalidateQueries({ queryKey: ["game_external_scores"] });
      await queryClient.refetchQueries({ queryKey: ["games_with_details"] });
      resetAndClose();
      toastSuccess("Jogo atualizado");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  function resetAndClose() {
    setTitle("");
    setSelectedGenres([]);
    setImageUrl("");
    setBackgroundImageUrl("");
    setDescription("");
    setExternalScores([]);
    setRawgQuery("");
    setRawgResults([]);
    setRawgDetail(null);
    onOpenChange(false);
  }

  const addScore = () =>
    setExternalScores([...externalScores, { source: "", score: "" }]);
  const removeScore = (i: number) =>
    setExternalScores(externalScores.filter((_, idx) => idx !== i));
  const updateScore = (i: number, field: "source" | "score", value: string) => {
    const updated = [...externalScores];
    updated[i] = { ...updated[i], [field]: value };
    setExternalScores(updated);
  };

  const handleSubmit = () => {
    if (isEdit) updateGame.mutate();
    else insertGame.mutate();
  };

  const pending =
    insertGame.isPending || updateGame.isPending || rawgDetailLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={DRAWER_SHEET_CONTENT_CLASS}>
        <SheetHeader className="space-y-0 px-6 pb-4 pt-6 text-left">
          <SheetTitle className="sr-only">
            {isEdit ? "Editar jogo" : "Adicionar jogo"}
          </SheetTitle>
          <DrawerGameHeader
            label={isEdit ? "Editar jogo" : "Novo jogo"}
            gameName={isEdit ? editingGame?.title : undefined}
          />
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {!isEdit && (
                <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                    <Search className="h-3.5 w-3.5 shrink-0" />
                    Buscar na RAWG
                  </div>
                  <div className="relative">
                    <Input
                      value={rawgQuery}
                      onChange={(e) => setRawgQuery(e.target.value)}
                      placeholder="Ex.: Hollow Knight, Elden Ring…"
                      disabled={rawgDetailLoading}
                      className="h-10 rounded-lg border-emerald-500/20 bg-background pr-9 text-sm focus-visible:ring-emerald-500/30"
                    />
                    {rawgSearchLoading && (
                      <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {rawgResults.length > 0 && (
                    <ul className="max-h-48 overflow-y-auto rounded-md border border-border bg-card text-sm shadow-sm">
                      {rawgResults.map((r) => (
                        <li
                          key={r.id}
                          className="border-b border-border last:border-0"
                        >
                          <button
                            type="button"
                            disabled={rawgDetailLoading}
                            onClick={() => void pickRawgResult(r.id)}
                            className={cn(
                              "flex w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-accent",
                              rawgDetailLoading && "opacity-50",
                            )}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                              <Gamepad2 className="h-5 w-5" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">
                                {r.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {r.released
                                  ? new Date(r.released).getFullYear()
                                  : "—"}
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {rawgDetail && (
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-800 dark:text-emerald-300">
                        Importação RAWG (#{rawgDetail.id})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setRawgDetail(null)}
                      >
                        Usar só cadastro manual
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-medium" htmlFor="game-title">
                  Título
                </Label>
                <Input
                  id="game-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome do jogo"
                  className="h-10 rounded-lg border-emerald-500/20 bg-background text-sm focus-visible:ring-emerald-500/30"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium" htmlFor="game-desc">
                  Descrição (opcional)
                </Label>
                <Textarea
                  id="game-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Resumo ou notas sobre o jogo…"
                  className="min-h-[240px] resize-none rounded-lg border-border/80 text-sm"
                />
              </div>

              <div className="space-y-2 min-w-0">
                <Label
                  className="text-xs font-medium"
                  htmlFor="game-genre-input"
                >
                  Gêneros (opcional)
                </Label>
                <GenreMultiSelectInput
                  inputId="game-genre-input"
                  genres={genres}
                  selected={selectedGenres}
                  onChange={setSelectedGenres}
                  placeholder="Ex.: RPG, Ação…"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium" htmlFor="game-cover-url">
                  Capa do jogo (URL)
                </Label>
                <Input
                  id="game-cover-url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                  className="h-10 rounded-lg border-emerald-500/20 bg-background text-sm focus-visible:ring-emerald-500/30"
                />
              </div>

              <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-medium">Notas externas</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addScore}
                    className="h-8 rounded-lg border-emerald-500/40 px-3 text-xs text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Adicionar
                  </Button>
                </div>
                {externalScores.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma nota externa.
                  </p>
                ) : (
                  externalScores.map((es, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={es.source}
                        onChange={(e) =>
                          updateScore(i, "source", e.target.value)
                        }
                        placeholder="Fonte (ex: Metacritic)"
                        className="h-10 flex-1 rounded-lg border-emerald-500/20 bg-background text-sm focus-visible:ring-emerald-500/30"
                      />
                      <Input
                        type="number"
                        step="0.1"
                        value={es.score}
                        onChange={(e) =>
                          updateScore(i, "score", e.target.value)
                        }
                        placeholder="96"
                        className="h-10 w-20 rounded-lg border-emerald-500/25 bg-background font-mono-nums text-sm focus-visible:ring-emerald-500/30"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeScore(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border/60 bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-lg border-emerald-500/45 text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300"
              disabled={!title.trim() || pending}
              onClick={handleSubmit}
            >
              {pending
                ? "Salvando…"
                : isEdit
                  ? "Salvar alterações"
                  : "Salvar jogo"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
