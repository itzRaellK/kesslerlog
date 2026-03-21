"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastSuccess, toastError, getErrorMessage } from "@/lib/toast";
import { cn } from "@/lib/utils";

const Q_GENRE_S = ["genre_types_settings"] as const;
const Q_STATUS_S = ["status_types_settings"] as const;
const Q_GAME_ST_S = ["game_status_types_settings"] as const;
const Q_BADGE_S = ["review_badge_types_settings"] as const;

/** Invalida caches da página e dos drawers/listagens que usam os mesmos tipos. */
function invalidateAllTypeQueries(qc: ReturnType<typeof useQueryClient>) {
  const keys: readonly (readonly string[])[] = [
    Q_GENRE_S,
    ["genre_types"],
    Q_STATUS_S,
    ["status_types"],
    Q_GAME_ST_S,
    ["game_status_types"],
    Q_BADGE_S,
    ["review_badge_types"],
  ];
  keys.forEach((k) => void qc.invalidateQueries({ queryKey: [...k] }));
}

function getColorClass(color: string | null) {
  if (!color) return "bg-muted-foreground";
  const map: Record<string, string> = {
    blue: "bg-primary",
    green: "bg-green-500",
    red: "bg-destructive",
    yellow: "bg-amber-500",
    orange: "bg-orange-500",
  };
  return map[color.toLowerCase()] ?? "bg-muted-foreground";
}

const COLOR_OPTIONS = [
  { value: "blue", label: "Azul" },
  { value: "green", label: "Verde" },
  { value: "red", label: "Vermelho" },
  { value: "yellow", label: "Amarelo" },
  { value: "orange", label: "Laranja" },
] as const;

type GenreRow = { id: string; name: string; active: boolean };
type StatusRow = {
  id: string;
  name: string;
  color: string | null;
  order: number;
  active: boolean;
};
type GameStatusRow = {
  id: string;
  name: string;
  order: number;
  active: boolean;
};
type BadgeRow = { id: string; name: string; active: boolean };

type DeleteTarget =
  | { kind: "genre"; row: GenreRow }
  | { kind: "status"; row: StatusRow }
  | { kind: "game_status"; row: GameStatusRow }
  | { kind: "badge"; row: BadgeRow };

const cardShell =
  "rounded-xl border border-emerald-500/20 bg-card shadow-sm dark:border-emerald-500/15 dark:shadow-[0_1px_0_0_rgba(16,185,129,0.06)]";
const headerShell = "border-b border-emerald-500/15 px-4 py-3";
/** Cabeçalho + ~5 linhas visíveis; altura igual em todos os cards; o restante rola. */
const tableScrollViewport = "h-[18rem] overflow-y-auto overscroll-y-contain";
const theadSticky = "sticky top-0 z-[1] bg-card";

export function SettingsContent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: isSuperadmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is_superadmin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_superadmin");
      if (error) throw error;
      return data === true;
    },
  });

  const canEdit = isSuperadmin === true;

  const { data: genres = [], isLoading: loadingG } = useQuery({
    queryKey: Q_GENRE_S,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genre_types")
        .select("id, name, active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as GenreRow[];
    },
  });

  const { data: statusTypes = [], isLoading: loadingSt } = useQuery({
    queryKey: Q_STATUS_S,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("status_types")
        .select("id, name, color, order, active")
        .order("order");
      if (error) throw error;
      return (data ?? []) as StatusRow[];
    },
  });

  const { data: gameStatusTypes = [], isLoading: loadingGs } = useQuery({
    queryKey: Q_GAME_ST_S,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_status_types")
        .select("id, name, order, active")
        .order("order");
      if (error) throw error;
      return (data ?? []) as GameStatusRow[];
    },
  });

  const { data: reviewBadges = [], isLoading: loadingB } = useQuery({
    queryKey: Q_BADGE_S,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_badge_types")
        .select("id, name, active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as BadgeRow[];
    },
  });

  const [genreOpen, setGenreOpen] = useState(false);
  const [genreEdit, setGenreEdit] = useState<GenreRow | null>(null);
  const [genreName, setGenreName] = useState("");

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusEdit, setStatusEdit] = useState<StatusRow | null>(null);
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState<string>("blue");
  const [statusOrder, setStatusOrder] = useState(0);

  const [gameStOpen, setGameStOpen] = useState(false);
  const [gameStEdit, setGameStEdit] = useState<GameStatusRow | null>(null);
  const [gameStName, setGameStName] = useState("");
  const [gameStOrder, setGameStOrder] = useState(0);

  const [badgeOpen, setBadgeOpen] = useState(false);
  const [badgeEdit, setBadgeEdit] = useState<BadgeRow | null>(null);
  const [badgeName, setBadgeName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const genreMut = useMutation({
    mutationFn: async () => {
      const name = genreName.trim();
      if (!name) throw new Error("Informe o nome.");
      const now = new Date().toISOString();
      if (genreEdit) {
        const { error } = await supabase
          .from("genre_types")
          .update({ name, updated_at: now })
          .eq("id", genreEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("genre_types").insert({
          name,
          active: true,
          updated_at: now,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAllTypeQueries(queryClient);
      toastSuccess(genreEdit ? "Gênero atualizado" : "Gênero criado");
      setGenreOpen(false);
      setGenreEdit(null);
      setGenreName("");
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  const statusMut = useMutation({
    mutationFn: async () => {
      const name = statusName.trim();
      if (!name) throw new Error("Informe o nome.");
      const now = new Date().toISOString();
      if (statusEdit) {
        const { error } = await supabase
          .from("status_types")
          .update({
            name,
            color: statusColor,
            order: statusOrder,
            updated_at: now,
          })
          .eq("id", statusEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("status_types").insert({
          name,
          color: statusColor,
          order: statusOrder,
          active: true,
          updated_at: now,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAllTypeQueries(queryClient);
      toastSuccess(statusEdit ? "Status atualizado" : "Status criado");
      setStatusOpen(false);
      setStatusEdit(null);
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  const gameStMut = useMutation({
    mutationFn: async () => {
      const name = gameStName.trim();
      if (!name) throw new Error("Informe o nome.");
      const now = new Date().toISOString();
      if (gameStEdit) {
        const { error } = await supabase
          .from("game_status_types")
          .update({
            name,
            order: gameStOrder,
            updated_at: now,
          })
          .eq("id", gameStEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("game_status_types").insert({
          name,
          order: gameStOrder,
          active: true,
          updated_at: now,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAllTypeQueries(queryClient);
      toastSuccess(
        gameStEdit ? "Status do jogo atualizado" : "Status do jogo criado",
      );
      setGameStOpen(false);
      setGameStEdit(null);
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  const badgeMut = useMutation({
    mutationFn: async () => {
      const name = badgeName.trim();
      if (!name) throw new Error("Informe o nome.");
      const now = new Date().toISOString();
      if (badgeEdit) {
        const { error } = await supabase
          .from("review_badge_types")
          .update({ name, updated_at: now })
          .eq("id", badgeEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("review_badge_types").insert({
          name,
          active: true,
          updated_at: now,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAllTypeQueries(queryClient);
      toastSuccess(badgeEdit ? "Badge atualizada" : "Badge criada");
      setBadgeOpen(false);
      setBadgeEdit(null);
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: async (p: {
      table:
        | "genre_types"
        | "status_types"
        | "game_status_types"
        | "review_badge_types";
      id: string;
      active: boolean;
    }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from(p.table)
        .update({ active: p.active, updated_at: now })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllTypeQueries(queryClient);
      toastSuccess("Status atualizado");
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: async (t: DeleteTarget) => {
      const table =
        t.kind === "genre"
          ? "genre_types"
          : t.kind === "status"
            ? "status_types"
            : t.kind === "game_status"
              ? "game_status_types"
              : "review_badge_types";
      const id = t.row.id;
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllTypeQueries(queryClient);
      toastSuccess("Registro excluído");
      setDeleteTarget(null);
    },
    onError: (e) =>
      toastError(
        getErrorMessage(e),
        "Pode haver jogos ou registros usando este item.",
      ),
  });

  function openNewGenre() {
    setGenreEdit(null);
    setGenreName("");
    setGenreOpen(true);
  }
  function openEditGenre(row: GenreRow) {
    setGenreEdit(row);
    setGenreName(row.name);
    setGenreOpen(true);
  }

  function openNewStatus() {
    setStatusEdit(null);
    setStatusName("");
    setStatusColor("blue");
    setStatusOrder(
      statusTypes.length ? Math.max(...statusTypes.map((s) => s.order)) + 1 : 0,
    );
    setStatusOpen(true);
  }
  function openEditStatus(row: StatusRow) {
    setStatusEdit(row);
    setStatusName(row.name);
    setStatusColor(row.color ?? "blue");
    setStatusOrder(row.order);
    setStatusOpen(true);
  }

  function openNewGameStatus() {
    setGameStEdit(null);
    setGameStName("");
    setGameStOrder(
      gameStatusTypes.length
        ? Math.max(...gameStatusTypes.map((s) => s.order)) + 1
        : 0,
    );
    setGameStOpen(true);
  }
  function openEditGameStatus(row: GameStatusRow) {
    setGameStEdit(row);
    setGameStName(row.name);
    setGameStOrder(row.order);
    setGameStOpen(true);
  }

  function openNewBadge() {
    setBadgeEdit(null);
    setBadgeName("");
    setBadgeOpen(true);
  }
  function openEditBadge(row: BadgeRow) {
    setBadgeEdit(row);
    setBadgeName(row.name);
    setBadgeOpen(true);
  }

  const busy =
    adminLoading ||
    loadingG ||
    loadingSt ||
    loadingGs ||
    loadingB ||
    genreMut.isPending ||
    statusMut.isPending ||
    gameStMut.isPending ||
    badgeMut.isPending ||
    toggleMut.isPending ||
    deleteMut.isPending;

  const deleteLabel =
    deleteTarget == null
      ? ""
      : deleteTarget.kind === "genre"
        ? `o gênero “${deleteTarget.row.name}”`
        : deleteTarget.kind === "status"
          ? `o status “${deleteTarget.row.name}”`
          : deleteTarget.kind === "game_status"
            ? `o status de jogo “${deleteTarget.row.name}”`
            : `a badge “${deleteTarget.row.name}”`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b border-emerald-500/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <Settings2 className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Configurações
            </h1>
            <p className="text-sm text-muted-foreground">
              Tipos globais do sistema (gêneros, status, badges). Alterações
              afetam todos os usuários.
            </p>
          </div>
        </div>
      </div>

      {adminLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando permissões…
        </div>
      ) : !canEdit ? (
        <div
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
          role="status"
        >
          Apenas o administrador pode criar, editar ou excluir itens aqui. Você
          pode visualizar a lista abaixo.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Gêneros */}
        <section className={cardShell}>
          <div
            className={cn(
              headerShell,
              "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <div>
              <h2 className="text-sm font-semibold">Gêneros</h2>
              <p className="text-xs text-muted-foreground">
                Categorias ao cadastrar jogos.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-md border-emerald-500/30 text-xs hover:bg-emerald-500/10"
              disabled={!canEdit || busy}
              onClick={openNewGenre}
            >
              <Plus className="h-3.5 w-3.5" />
              Novo gênero
            </Button>
          </div>
          <div className="overflow-x-auto">
            <div className={tableScrollViewport}>
              <table className="w-full min-w-[320px]">
                <thead className={theadSticky}>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Nome</th>
                    <th className="px-4 py-2.5 text-left font-medium">
                      Situação
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {genres.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Nenhum gênero cadastrado.
                      </td>
                    </tr>
                  ) : (
                    genres.map((genre) => (
                      <tr
                        key={genre.id}
                        className="border-b border-border/80 last:border-0"
                      >
                        <td className="px-4 py-2.5 text-sm">{genre.name}</td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] rounded-md",
                              genre.active
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {genre.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <RowActions
                            canEdit={canEdit}
                            busy={busy}
                            onEdit={() => openEditGenre(genre)}
                            onToggle={() =>
                              toggleMut.mutate({
                                table: "genre_types",
                                id: genre.id,
                                active: !genre.active,
                              })
                            }
                            onDelete={() =>
                              setDeleteTarget({ kind: "genre", row: genre })
                            }
                            active={genre.active}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Status de ciclo */}
        <section className={cardShell}>
          <div
            className={cn(
              headerShell,
              "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <div>
              <h2 className="text-sm font-semibold">Status (ciclo)</h2>
              <p className="text-xs text-muted-foreground">
                Jogando, finalizado, fila, etc.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-md border-emerald-500/30 text-xs hover:bg-emerald-500/10"
              disabled={!canEdit || busy}
              onClick={openNewStatus}
            >
              <Plus className="h-3.5 w-3.5" />
              Novo status
            </Button>
          </div>
          <div className="overflow-x-auto">
            <div className={tableScrollViewport}>
              <table className="w-full min-w-[400px]">
                <thead className={theadSticky}>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Nome</th>
                    <th className="px-4 py-2.5 text-left font-medium">Cor</th>
                    <th className="px-4 py-2.5 text-left font-medium">Ordem</th>
                    <th className="px-4 py-2.5 text-left font-medium">
                      Situação
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {statusTypes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Nenhum status cadastrado.
                      </td>
                    </tr>
                  ) : (
                    statusTypes.map((status) => (
                      <tr
                        key={status.id}
                        className="border-b border-border/80 last:border-0"
                      >
                        <td className="px-4 py-2.5 text-sm">{status.name}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "h-3 w-3 rounded-full",
                                getColorClass(status.color),
                              )}
                            />
                            <span className="text-xs text-muted-foreground">
                              {status.color ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-sm tabular-nums text-muted-foreground">
                          {status.order}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] rounded-md",
                              status.active
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {status.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <RowActions
                            canEdit={canEdit}
                            busy={busy}
                            onEdit={() => openEditStatus(status)}
                            onToggle={() =>
                              toggleMut.mutate({
                                table: "status_types",
                                id: status.id,
                                active: !status.active,
                              })
                            }
                            onDelete={() =>
                              setDeleteTarget({ kind: "status", row: status })
                            }
                            active={status.active}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Status do jogo */}
        <section className={cardShell}>
          <div
            className={cn(
              headerShell,
              "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <div>
              <h2 className="text-sm font-semibold">Status do jogo</h2>
              <p className="text-xs text-muted-foreground">
                Não iniciado, jogando, concluído…
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-md border-emerald-500/30 text-xs hover:bg-emerald-500/10"
              disabled={!canEdit || busy}
              onClick={openNewGameStatus}
            >
              <Plus className="h-3.5 w-3.5" />
              Novo
            </Button>
          </div>
          <div className="overflow-x-auto">
            <div className={tableScrollViewport}>
              <table className="w-full min-w-[320px]">
                <thead className={theadSticky}>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Nome</th>
                    <th className="px-4 py-2.5 text-left font-medium">Ordem</th>
                    <th className="px-4 py-2.5 text-left font-medium">
                      Situação
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gameStatusTypes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Nenhum item cadastrado.
                      </td>
                    </tr>
                  ) : (
                    gameStatusTypes.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/80 last:border-0"
                      >
                        <td className="px-4 py-2.5 text-sm">{item.name}</td>
                        <td className="px-4 py-2.5 text-sm tabular-nums text-muted-foreground">
                          {item.order}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] rounded-md",
                              item.active
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {item.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <RowActions
                            canEdit={canEdit}
                            busy={busy}
                            onEdit={() => openEditGameStatus(item)}
                            onToggle={() =>
                              toggleMut.mutate({
                                table: "game_status_types",
                                id: item.id,
                                active: !item.active,
                              })
                            }
                            onDelete={() =>
                              setDeleteTarget({
                                kind: "game_status",
                                row: item,
                              })
                            }
                            active={item.active}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className={cardShell}>
          <div
            className={cn(
              headerShell,
              "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <div>
              <h2 className="text-sm font-semibold">Badges de review</h2>
              <p className="text-xs text-muted-foreground">
                Rótulos da avaliação final.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-md border-emerald-500/30 text-xs hover:bg-emerald-500/10"
              disabled={!canEdit || busy}
              onClick={openNewBadge}
            >
              <Plus className="h-3.5 w-3.5" />
              Nova badge
            </Button>
          </div>
          <div className="overflow-x-auto">
            <div className={tableScrollViewport}>
              <table className="w-full min-w-[320px]">
                <thead className={theadSticky}>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Nome</th>
                    <th className="px-4 py-2.5 text-left font-medium">
                      Situação
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reviewBadges.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Nenhuma badge cadastrada.
                      </td>
                    </tr>
                  ) : (
                    reviewBadges.map((badge) => (
                      <tr
                        key={badge.id}
                        className="border-b border-border/80 last:border-0"
                      >
                        <td className="px-4 py-2.5 text-sm">{badge.name}</td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] rounded-md",
                              badge.active
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {badge.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <RowActions
                            canEdit={canEdit}
                            busy={busy}
                            onEdit={() => openEditBadge(badge)}
                            onToggle={() =>
                              toggleMut.mutate({
                                table: "review_badge_types",
                                id: badge.id,
                                active: !badge.active,
                              })
                            }
                            onDelete={() =>
                              setDeleteTarget({ kind: "badge", row: badge })
                            }
                            active={badge.active}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Dialog gênero */}
      <Dialog
        open={genreOpen}
        onOpenChange={(o) => {
          setGenreOpen(o);
          if (!o) setGenreEdit(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {genreEdit ? "Editar gênero" : "Novo gênero"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="genre-name">Nome</Label>
            <Input
              id="genre-name"
              value={genreName}
              onChange={(e) => setGenreName(e.target.value)}
              placeholder="Ex.: RPG"
              maxLength={120}
              className="rounded-lg"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setGenreOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-500"
              disabled={genreMut.isPending}
              onClick={() => genreMut.mutate()}
            >
              {genreMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog status ciclo */}
      <Dialog
        open={statusOpen}
        onOpenChange={(o) => {
          setStatusOpen(o);
          if (!o) setStatusEdit(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusEdit ? "Editar status (ciclo)" : "Novo status (ciclo)"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="st-name">Nome</Label>
              <Input
                id="st-name"
                value={statusName}
                onChange={(e) => setStatusName(e.target.value)}
                maxLength={120}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor (UI)</Label>
              <Select value={statusColor} onValueChange={setStatusColor}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-order">Ordem</Label>
              <Input
                id="st-order"
                type="number"
                min={0}
                value={statusOrder}
                onChange={(e) =>
                  setStatusOrder(parseInt(e.target.value, 10) || 0)
                }
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setStatusOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-500"
              disabled={statusMut.isPending}
              onClick={() => statusMut.mutate()}
            >
              {statusMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog status jogo */}
      <Dialog
        open={gameStOpen}
        onOpenChange={(o) => {
          setGameStOpen(o);
          if (!o) setGameStEdit(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {gameStEdit ? "Editar status do jogo" : "Novo status do jogo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="gs-name">Nome</Label>
              <Input
                id="gs-name"
                value={gameStName}
                onChange={(e) => setGameStName(e.target.value)}
                maxLength={120}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gs-order">Ordem</Label>
              <Input
                id="gs-order"
                type="number"
                min={0}
                value={gameStOrder}
                onChange={(e) =>
                  setGameStOrder(parseInt(e.target.value, 10) || 0)
                }
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setGameStOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-500"
              disabled={gameStMut.isPending}
              onClick={() => gameStMut.mutate()}
            >
              {gameStMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog badge */}
      <Dialog
        open={badgeOpen}
        onOpenChange={(o) => {
          setBadgeOpen(o);
          if (!o) setBadgeEdit(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {badgeEdit ? "Editar badge" : "Nova badge"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="bd-name">Nome</Label>
            <Input
              id="bd-name"
              value={badgeName}
              onChange={(e) => setBadgeName(e.target.value)}
              maxLength={120}
              className="rounded-lg"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setBadgeOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-500"
              disabled={badgeMut.isPending}
              onClick={() => badgeMut.mutate()}
            >
              {badgeMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteLabel}? Isso não é possível
              se ainda houver jogos ou dados vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (deleteTarget) deleteMut.mutate(deleteTarget);
              }}
            >
              {deleteMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowActions({
  canEdit,
  busy,
  onEdit,
  onToggle,
  onDelete,
  active,
}: {
  canEdit: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  active: boolean;
}) {
  if (!canEdit) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
        disabled={busy}
        title="Editar"
        onClick={onEdit}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
        disabled={busy}
        title={active ? "Desativar" : "Ativar"}
        onClick={onToggle}
      >
        {active ? (
          <ToggleRight className="h-3.5 w-3.5" />
        ) : (
          <ToggleLeft className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
        disabled={busy}
        title="Excluir"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
