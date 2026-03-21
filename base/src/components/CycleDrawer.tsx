import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  cycles,
  getSessionsByCycleId,
  formatDuration,
  getTotalDuration,
  getAverageScore,
  type Cycle,
} from "@/data/mock";
import { Plus } from "lucide-react";
import { useState } from "react";

interface CycleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId?: string;
  gameName?: string;
}

export function CycleDrawer({ open, onOpenChange, gameId, gameName }: CycleDrawerProps) {
  const [newCycleName, setNewCycleName] = useState("");
  const gameCycles = cycles.filter((c) => c.game_id === gameId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[450px] sm:max-w-[450px]">
        <SheetHeader>
          <SheetTitle className="text-sm font-semibold">Ciclos</SheetTitle>
          {gameName && <p className="text-xs text-muted-foreground">{gameName}</p>}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* New Cycle */}
          <div className="flex gap-2">
            <Input
              value={newCycleName}
              onChange={(e) => setNewCycleName(e.target.value)}
              placeholder="Nome do novo ciclo"
              className="text-sm"
            />
            <Button size="sm" disabled={!newCycleName.trim()}>
              <Plus className="mr-1 h-3 w-3" /> Criar
            </Button>
          </div>

          {/* Cycle List */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Ciclos existentes</Label>
            {gameCycles.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum ciclo criado.</p>
            )}
            {gameCycles.map((cycle) => (
              <CycleCard key={cycle.id} cycle={cycle} />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CycleCard({ cycle }: { cycle: Cycle }) {
  const cycleSessions = getSessionsByCycleId(cycle.id);
  const totalTime = getTotalDuration(cycleSessions);
  const avgScore = getAverageScore(cycleSessions);

  return (
    <div className="rounded-md border border-border bg-surface p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{cycle.name}</p>
        <Badge
          variant="secondary"
          className={cn(
            "text-[11px]",
            cycle.status === "finished" && "bg-positive/10 text-positive",
            cycle.status === "active" && "bg-primary/10 text-primary"
          )}
        >
          {cycle.status === "finished" ? "Finalizado" : "Ativo"}
        </Badge>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{cycleSessions.length} sessões</span>
        <span className="tabular-nums">{formatDuration(totalTime)}</span>
        {avgScore > 0 && <span className="tabular-nums">Média: {avgScore}</span>}
      </div>
      {cycle.status === "active" && (
        <Button variant="outline" size="sm" className="mt-1 h-7 text-xs">
          Finalizar Ciclo
        </Button>
      )}
    </div>
  );
}
