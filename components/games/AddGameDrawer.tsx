"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { DrawerGameHeader } from "@/components/games/DrawerGameHeader";
import {
  GenreAutocompleteInput,
  type GenreRow,
} from "@/components/games/GenreAutocompleteInput";
import { toastSuccess, toastError, getErrorMessage } from "@/lib/toast";

export type GameToEdit = {
  id: string;
  title: string;
  image_url: string | null;
  genre_type_id: string | null;
  externalScores: { source: string; score: string }[];
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
  const [genreId, setGenreId] = useState("");
  /** Texto digitado / nome do gênero escolhido (autocomplete). */
  const [genreInput, setGenreInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [externalScores, setExternalScores] = useState<
    { source: string; score: string }[]
  >([]);

  const supabase = createClient();
  const queryClient = useQueryClient();
  const isEdit = !!editingGame?.id;

  const { data: genres = [] } = useQuery({
    queryKey: ["genre_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genre_types")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as GenreRow[];
    },
  });

  useEffect(() => {
    if (open && editingGame) {
      setTitle(editingGame.title);
      setGenreId(editingGame.genre_type_id ?? "");
      if (!editingGame.genre_type_id) setGenreInput("");
      setImageUrl(editingGame.image_url ?? "");
      setExternalScores(
        editingGame.externalScores.length > 0
          ? editingGame.externalScores.map((es) => ({
              source: es.source,
              score: String(es.score),
            }))
          : [{ source: "", score: "" }],
      );
    }
    if (open && !editingGame) {
      setTitle("");
      setGenreId("");
      setGenreInput("");
      setImageUrl("");
      setExternalScores([]);
    }
  }, [open, editingGame]);

  /** Preenche o nome do gênero ao editar (quando a lista carrega). */
  useEffect(() => {
    if (!open || !editingGame?.genre_type_id) return;
    const g = genres.find((x) => x.id === editingGame.genre_type_id);
    setGenreInput(g?.name ?? "");
  }, [open, editingGame?.genre_type_id, genres]);

  const insertGame = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error("Não autenticado");
      const { data: notStarted } = await supabase
        .from("game_status_types")
        .select("id")
        .ilike("name", "Não iniciado")
        .maybeSingle();
      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert({
          user_id: user.user.id,
          title: title.trim(),
          genre_type_id: resolveGenreTypeId(),
          game_status_type_id: notStarted?.id ?? null,
          image_url: imageUrl.trim() || null,
        })
        .select("id")
        .single();
      if (gameError) throw gameError;
      if (game && externalScores.some((es) => es.source.trim() && es.score)) {
        const rows = externalScores
          .filter((es) => es.source.trim() && es.score)
          .map((es) => ({
            game_id: game.id,
            source: es.source.trim(),
            score: parseFloat(es.score) || 0,
          }));
        if (rows.length) {
          await supabase.from("game_external_scores").insert(rows);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["games_with_details"] });
      queryClient.invalidateQueries({ queryKey: ["game_external_scores"] });
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
          genre_type_id: resolveGenreTypeId(),
          image_url: imageUrl.trim() || null,
        })
        .eq("id", editingGame.id);
      if (gameError) throw gameError;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["games_with_details"] });
      queryClient.invalidateQueries({ queryKey: ["game_external_scores"] });
      resetAndClose();
      toastSuccess("Jogo atualizado");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  function resetAndClose() {
    setTitle("");
    setGenreId("");
    setGenreInput("");
    setImageUrl("");
    setExternalScores([]);
    onOpenChange(false);
  }

  /** id em `genre_types` a partir do texto / seleção (ou null se vazio ou inválido). */
  function resolveGenreTypeId(): string | null {
    const trimmed = genreInput.trim();
    if (!trimmed) return null;
    if (genreId) {
      const byId = genres.find((g) => g.id === genreId);
      if (byId && byId.name === trimmed) return genreId;
    }
    return (
      genres.find((g) => g.name.toLowerCase() === trimmed.toLowerCase())?.id ??
      null
    );
  }

  const addScore = () =>
    setExternalScores([...externalScores, { source: "", score: "" }]);
  const removeScore = (i: number) =>
    setExternalScores(externalScores.filter((_, idx) => idx !== i));
  const updateScore = (
    i: number,
    field: "source" | "score",
    value: string,
  ) => {
    const updated = [...externalScores];
    updated[i] = { ...updated[i], [field]: value };
    setExternalScores(updated);
  };

  const handleSubmit = () => {
    if (isEdit) updateGame.mutate();
    else insertGame.mutate();
  };

  const pending = insertGame.isPending || updateGame.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-[min(100vw,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]"
      >
        <SheetHeader className="space-y-0 border-b border-border px-6 pb-4 pt-6 text-left">
          <SheetTitle className="sr-only">
            {isEdit ? "Editar jogo" : "Adicionar jogo"}
          </SheetTitle>
          <DrawerGameHeader
            label={isEdit ? "Editar jogo" : "Novo jogo"}
            gameName={isEdit ? editingGame?.title : undefined}
          />
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome do jogo"
                className="h-10 rounded-lg border-emerald-500/20 bg-background text-sm focus-visible:ring-emerald-500/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium" htmlFor="game-genre-input">
                Gênero (opcional)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Digite para filtrar e escolha um gênero da lista.
              </p>
              <GenreAutocompleteInput
                inputId="game-genre-input"
                value={genreInput}
                onChange={setGenreInput}
                genres={genres}
                selectedId={genreId}
                onIdChange={setGenreId}
                placeholder="Ex.: RPG, Ação, Metroidvania…"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Imagem (URL)</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="h-10 rounded-lg border-emerald-500/20 bg-background text-sm focus-visible:ring-emerald-500/30"
              />
            </div>

            <div className="space-y-2">
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
                      className="h-10 w-10 shrink-0 rounded-lg"
                      onClick={() => removeScore(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))
              )}
            </div>

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
