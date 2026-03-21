import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { genres, gameStatuses, reviewBadges } from "@/data/mock";
import { cn } from "@/lib/utils";

export default function Settings() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-lg font-semibold">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento de tipos e categorias do sistema.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Genres */}
          <div className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium">Gêneros</h3>
              <Button size="sm" variant="outline" className="h-7 text-xs">Novo Gênero</Button>
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
                {genres.map((genre) => (
                  <tr key={genre.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-sm">{genre.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          genre.active ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                        )}
                      >
                        {genre.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-6 text-xs">Editar</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">
                          {genre.active ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Statuses */}
          <div className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium">Status</h3>
              <Button size="sm" variant="outline" className="h-7 text-xs">Novo Status</Button>
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
                {gameStatuses.map((status) => (
                  <tr key={status.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-sm">{status.name}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-3 w-3 rounded-full", getColorClass(status.color))} />
                        <span className="text-xs text-muted-foreground">{status.color}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-muted-foreground">{status.order}</td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          status.active ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                        )}
                      >
                        {status.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-6 text-xs">Editar</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">
                          {status.active ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Review Badges */}
          <div className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium">Badges de Review</h3>
              <Button size="sm" variant="outline" className="h-7 text-xs">Nova Badge</Button>
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
                {reviewBadges.map((badge) => (
                  <tr key={badge.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-sm">{badge.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          badge.active ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                        )}
                      >
                        {badge.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-6 text-xs">Editar</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">
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
    </Layout>
  );
}

function getColorClass(color: string) {
  const map: Record<string, string> = {
    blue: "bg-primary",
    green: "bg-positive",
    red: "bg-negative",
    yellow: "bg-warning",
    orange: "bg-warning",
  };
  return map[color] || "bg-muted-foreground";
}
