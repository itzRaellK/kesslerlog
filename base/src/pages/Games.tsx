import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  games,
  genres,
  getGenreById,
  getCyclesByGameId,
  getSessionsByGameId,
  getReviewsByGameId,
  formatDuration,
  getTotalDuration,
  getAverageScore,
} from "@/data/mock";
import { Plus, Pencil, Trash2, RefreshCw, Play, MessageSquare } from "lucide-react";
import { AddGameDialog } from "@/components/AddGameDialog";
import { CycleDrawer } from "@/components/CycleDrawer";
import { SessionDrawer } from "@/components/SessionDrawer";
import { ReviewDrawer } from "@/components/ReviewDrawer";

export default function Games() {
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [cycleDrawer, setCycleDrawer] = useState<{ open: boolean; gameId?: string; gameName?: string }>({ open: false });
  const [sessionDrawer, setSessionDrawer] = useState<{ open: boolean; gameId?: string; gameName?: string; cycleName?: string }>({ open: false });
  const [reviewDrawer, setReviewDrawer] = useState<{ open: boolean; gameId?: string; gameName?: string }>({ open: false });

  const activeGenres = genres.filter((g) => g.active);

  const filteredGames = games.filter((game) => {
    const matchesSearch = game.title.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = genreFilter === "all" || game.genre_id === genreFilter;
    return matchesSearch && matchesGenre;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold">Jogos</h1>
          <p className="text-sm text-muted-foreground">Gerencie sua biblioteca de jogos.</p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jogo..."
            className="w-64 text-sm"
          />
          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger className="w-40 text-sm">
              <SelectValue placeholder="Gênero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {activeGenres.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-1 h-3 w-3" /> Adicionar Jogo
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Jogo</th>
                <th className="px-4 py-3 text-left font-medium">Gênero</th>
                <th className="px-4 py-3 text-left font-medium">Notas Externas</th>
                <th className="px-4 py-3 text-left font-medium">Sessões</th>
                <th className="px-4 py-3 text-left font-medium">Tempo Total</th>
                <th className="px-4 py-3 text-left font-medium">Cadastro</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((game) => {
                const genre = getGenreById(game.genre_id);
                const gameSessions = getSessionsByGameId(game.id);
                const totalTime = getTotalDuration(gameSessions);
                const gameCycles = getCyclesByGameId(game.id);
                const activeCycle = gameCycles.find((c) => c.status === "active");

                return (
                  <tr key={game.id} className="border-b border-border last:border-0 transition-colors hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface border border-border">
                          <img src={game.image_url} alt={game.title} className="h-full w-full object-cover" />
                        </div>
                        <span className="text-sm font-medium">{game.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[11px]">{genre?.name}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {game.external_scores.map((es, i) => (
                          <span key={i} className="inline-flex items-center rounded-sm bg-surface px-1.5 py-0.5 text-[11px] tabular-nums font-medium">
                            {es.source} <span className="ml-1 text-primary">{es.score}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{gameSessions.length}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{formatDuration(totalTime)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(game.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Excluir">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Ciclo"
                          onClick={() => setCycleDrawer({ open: true, gameId: game.id, gameName: game.title })}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Sessão"
                          onClick={() =>
                            setSessionDrawer({
                              open: true,
                              gameId: game.id,
                              gameName: game.title,
                              cycleName: activeCycle?.name || "Sem ciclo ativo",
                            })
                          }
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Review"
                          onClick={() => setReviewDrawer({ open: true, gameId: game.id, gameName: game.title })}
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddGameDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <CycleDrawer open={cycleDrawer.open} onOpenChange={(o) => setCycleDrawer({ ...cycleDrawer, open: o })} gameId={cycleDrawer.gameId} gameName={cycleDrawer.gameName} />
      <SessionDrawer open={sessionDrawer.open} onOpenChange={(o) => setSessionDrawer({ ...sessionDrawer, open: o })} gameName={sessionDrawer.gameName} cycleName={sessionDrawer.cycleName} />
      <ReviewDrawer open={reviewDrawer.open} onOpenChange={(o) => setReviewDrawer({ ...reviewDrawer, open: o })} gameId={reviewDrawer.gameId} gameName={reviewDrawer.gameName} />
    </Layout>
  );
}
