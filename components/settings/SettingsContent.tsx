"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

export function SettingsContent() {
  const supabase = createClient();

  const { data: genres = [] } = useQuery({
    queryKey: ["genre_types_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genre_types")
        .select("id, name, active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: statusTypes = [] } = useQuery({
    queryKey: ["status_types_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("status_types")
        .select("id, name, color, order, active")
        .order("order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: gameStatusTypes = [] } = useQuery({
    queryKey: ["game_status_types_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_status_types")
        .select("id, name, order, active")
        .order("order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reviewBadges = [] } = useQuery({
    queryKey: ["review_badge_types_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_badge_types")
        .select("id, name, active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerenciamento de tipos e categorias do sistema.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">Gêneros</h3>
            <Button size="sm" variant="outline" className="h-7 text-xs rounded-md">
              Novo Gênero
            </Button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Nome</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {genres.map((genre: { id: string; name: string; active: boolean }) => (
                <tr
                  key={genre.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-2.5 text-sm">{genre.name}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] rounded-md",
                        genre.active
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {genre.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs rounded-md"
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground rounded-md"
                      >
                        {genre.active ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">Status</h3>
            <Button size="sm" variant="outline" className="h-7 text-xs rounded-md">
              Novo Status
            </Button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Nome</th>
                <th className="px-4 py-2 text-left font-medium">Cor</th>
                <th className="px-4 py-2 text-left font-medium">Ordem</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {statusTypes.map(
                (status: {
                  id: string;
                  name: string;
                  color: string | null;
                  order: number;
                  active: boolean;
                }) => (
                  <tr
                    key={status.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-2.5 text-sm">{status.name}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-3 w-3 rounded-full",
                            getColorClass(status.color)
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
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {status.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs rounded-md"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground rounded-md"
                        >
                          {status.active ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">Status do jogo</h3>
            <Button size="sm" variant="outline" className="h-7 text-xs rounded-md">
              Novo status
            </Button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Nome</th>
                <th className="px-4 py-2 text-left font-medium">Ordem</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {gameStatusTypes.map((item: { id: string; name: string; order: number; active: boolean }) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-sm">{item.name}</td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-muted-foreground">{item.order}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] rounded-md",
                        item.active
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {item.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-xs rounded-md">
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground rounded-md"
                      >
                        {item.active ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">Badges de Review</h3>
            <Button size="sm" variant="outline" className="h-7 text-xs rounded-md">
              Nova Badge
            </Button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Nome</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {reviewBadges.map((badge: { id: string; name: string; active: boolean }) => (
                <tr
                  key={badge.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-2.5 text-sm">{badge.name}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] rounded-md",
                        badge.active
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {badge.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs rounded-md"
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground rounded-md"
                      >
                        {badge.active ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
