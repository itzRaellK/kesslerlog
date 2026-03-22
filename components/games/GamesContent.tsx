"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ListPlus, ListX } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { AddGameDrawer, type GameToEdit } from "./AddGameDrawer";
import { GameTitleAutocompleteInput } from "./GameTitleAutocompleteInput";
import { GenreAutocompleteInput } from "./GenreAutocompleteInput";
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
import { toastSuccess, toastError, getErrorMessage } from "@/lib/toast";

export function GamesContent() {
  const [search, setSearch] = useState("");
  /** Texto do filtro de gênero; `genreFilterId` define seleção exata (lista). */
  const [genreInput, setGenreInput] = useState("");
  const [genreFilterId, setGenreFilterId] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameToEdit | null>(null);
  const [gameToDelete, setGameToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const supabase = createClient();
  const queryClient = useQueryClient();

  const deleteGame = useMutation({
    mutationFn: async (gameId: string) => {
      const { error } = await supabase.from("games").delete().eq("id", gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["games_with_details"] });
      queryClient.invalidateQueries({ queryKey: ["game_external_scores"] });
      setGameToDelete(null);
    },
  });

  const { data: genres = [] } = useQuery({
    queryKey: ["genre_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genre_types")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: games = [] } = useQuery({
    queryKey: ["games_with_details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games_with_details")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const gameTitleSuggestions = useMemo(() => {
    const seen = new Set<string>();
    (games as Array<{ title?: string | null }>).forEach((g) => {
      const t = g.title?.trim();
      if (t) seen.add(t);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [games]);

  const { data: externalScoresMap } = useQuery({
    queryKey: ["game_external_scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_external_scores")
        .select("game_id, source, score");
      if (error) throw error;
      const map: Record<string, Array<{ source: string; score: number }>> = {};
      (data ?? []).forEach(
        (r: { game_id: string; source: string; score: number }) => {
          if (!map[r.game_id]) map[r.game_id] = [];
          map[r.game_id].push({ source: r.source, score: r.score });
        },
      );
      return map;
    },
  });

  const { data: waitlistItems = [] } = useQuery({
    queryKey: ["waitlist_with_details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist_with_details")
        .select("id, game_id, position, game_title, game_image_url")
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const gameIdsInWaitlist = new Set(
    waitlistItems.map((w: { game_id: string }) => w.game_id),
  );

  const addToWaitlist = useMutation({
    mutationFn: async (gameId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error("Não autenticado");
      const { data: max } = await supabase
        .from("waitlist")
        .select("position")
        .eq("user_id", user.user.id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextPosition = (max?.position ?? 0) + 1;
      const { error } = await supabase.from("waitlist").insert({
        user_id: user.user.id,
        game_id: gameId,
        position: nextPosition,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist_with_details"] });
      toastSuccess("Adicionado à fila");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const removeFromWaitlist = useMutation({
    mutationFn: async (gameId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("waitlist")
        .delete()
        .eq("user_id", user.user.id)
        .eq("game_id", gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist_with_details"] });
      toastSuccess("Removido da fila");
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const filteredGames = games.filter(
    (g: {
      title?: string;
      genre_type_id: string | null;
      genre_name?: string | null;
    }) => {
      const title = g.title ?? "";
      const matchesSearch = title.toLowerCase().includes(search.toLowerCase());

      const gn = (g.genre_name ?? "").toLowerCase();
      const genreQ = genreInput.trim().toLowerCase();
      let matchesGenre = true;
      if (genreFilterId) {
        matchesGenre = g.genre_type_id === genreFilterId;
      } else if (genreQ) {
        matchesGenre = gn.includes(genreQ);
      }
      return matchesSearch && matchesGenre;
    },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Biblioteca de jogos</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie sua biblioteca de jogos.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 min-w-[12rem] flex-1 max-w-xs">
          <Label
            htmlFor="library-search-game"
            className="text-xs font-medium text-muted-foreground"
          >
            Buscar jogo
          </Label>
          <GameTitleAutocompleteInput
            inputId="library-search-game"
            value={search}
            onChange={setSearch}
            titles={gameTitleSuggestions}
            placeholder="Digite ou escolha um título…"
          />
        </div>
        <div className="space-y-1.5 min-w-[12rem] flex-1 max-w-xs">
          <Label
            htmlFor="library-filter-genre"
            className="text-xs font-medium text-muted-foreground"
          >
            Gênero
          </Label>
          <GenreAutocompleteInput
            inputId="library-filter-genre"
            value={genreInput}
            onChange={setGenreInput}
            genres={genres as { id: string; name: string }[]}
            selectedId={genreFilterId}
            onIdChange={setGenreFilterId}
            placeholder="Digite ou escolha um gênero…"
          />
        </div>
        <div className="ml-auto pb-0.5">
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg border-emerald-500/45 text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300"
            onClick={() => {
              setEditingGame(null);
              setAddDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-3 w-3" /> Adicionar jogo
          </Button>
        </div>
      </div>

      {waitlistItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Lista de espera
          </h2>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {waitlistItems.map(
              (
                item: {
                  id: string;
                  game_id: string;
                  position: number;
                  game_title: string;
                  game_image_url: string | null;
                },
                index: number,
              ) => (
                <div
                  key={item.id}
                  className="flex h-[3.25rem] min-w-0 max-w-full items-center gap-2 rounded-xl border border-emerald-500/20 bg-card px-2.5 py-2 shadow-sm"
                >
                  <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.game_image_url ? (
                      <img
                        src={item.game_image_url}
                        alt={item.game_title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {item.game_title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:text-destructive"
                    title="Remover da fila"
                    onClick={() => removeFromWaitlist.mutate(item.game_id)}
                    disabled={removeFromWaitlist.isPending}
                  >
                    <ListX className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      <div className="rounded-xl border border-border/60 bg-card/90">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Jogo</th>
              <th className="px-4 py-3 text-center font-medium">Gênero</th>
              <th className="px-4 py-3 text-center font-medium">
                Notas Externas
              </th>
              <th className="px-4 py-3 text-center font-medium">Cadastro</th>
              <th className="px-4 py-3 text-center font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredGames.map(
              (game: {
                id: string;
                title: string;
                image_url: string | null;
                genre_name: string;
                genre_type_id: string | null;
                created_at: string;
              }) => {
                const externalScores = externalScoresMap?.[game.id] ?? [];
                return (
                  <tr
                    key={game.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-accent/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted border border-border">
                          {game.image_url ? (
                            <img
                              src={game.image_url}
                              alt={game.title}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <span className="text-sm font-medium">
                          {game.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center align-middle">
                      <span className="inline-flex items-center justify-center rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-400">
                        {game.genre_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center align-middle">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {externalScores.map((es, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center justify-center rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] tabular-nums font-medium text-emerald-800 dark:text-emerald-400"
                          >
                            {es.source}{" "}
                            <span className="ml-1 font-semibold tabular-nums">
                              {es.score}
                            </span>
                          </span>
                        ))}
                        {externalScores.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center align-middle text-sm text-muted-foreground">
                      {new Date(game.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        {gameIdsInWaitlist.has(game.id) ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                            title="Na fila (clique para remover)"
                            onClick={() => removeFromWaitlist.mutate(game.id)}
                            disabled={removeFromWaitlist.isPending}
                          >
                            <ListX className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md"
                            title="Adicionar à fila"
                            onClick={() => addToWaitlist.mutate(game.id)}
                            disabled={addToWaitlist.isPending}
                          >
                            <ListPlus className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md"
                          title="Editar"
                          onClick={() => {
                            setEditingGame({
                              id: game.id,
                              title: game.title,
                              image_url: game.image_url,
                              genre_type_id: game.genre_type_id ?? null,
                              externalScores: externalScores.map((es) => ({
                                source: es.source,
                                score: String(es.score),
                              })),
                            });
                            setAddDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Excluir"
                          onClick={() =>
                            setGameToDelete({ id: game.id, title: game.title })
                          }
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>

      <AddGameDrawer
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditingGame(null);
        }}
        editingGame={editingGame}
      />
      <AlertDialog
        open={!!gameToDelete}
        onOpenChange={(open) => !open && setGameToDelete(null)}
      >
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir jogo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{gameToDelete?.title}&quot;?
              Esta ação não pode ser desfeita e remove também ciclos, sessões e
              reviews vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => gameToDelete && deleteGame.mutate(gameToDelete.id)}
              disabled={deleteGame.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGame.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
