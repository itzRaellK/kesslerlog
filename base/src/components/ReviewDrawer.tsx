import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { reviewBadges, cycles } from "@/data/mock";
import { useState } from "react";

interface ReviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId?: string;
  gameName?: string;
}

export function ReviewDrawer({ open, onOpenChange, gameId, gameName }: ReviewDrawerProps) {
  const [selectedBadge, setSelectedBadge] = useState("");
  const [score, setScore] = useState("");
  const [text, setText] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("");

  const gameCycles = cycles.filter((c) => c.game_id === gameId && c.status === "finished");
  const activeBadges = reviewBadges.filter((b) => b.active);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[450px] sm:max-w-[450px]">
        <SheetHeader>
          <SheetTitle className="text-sm font-semibold">Nova Review</SheetTitle>
          {gameName && <p className="text-xs text-muted-foreground">{gameName}</p>}
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Cycle selection */}
          <div className="space-y-2">
            <Label className="text-xs">Ciclo finalizado</Label>
            {gameCycles.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum ciclo finalizado disponível.</p>
            ) : (
              <div className="space-y-1">
                {gameCycles.map((cycle) => (
                  <button
                    key={cycle.id}
                    onClick={() => setSelectedCycle(cycle.id)}
                    className={cn(
                      "w-full rounded-md border border-border px-3 py-2 text-left text-sm transition-colors",
                      selectedCycle === cycle.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    )}
                  >
                    {cycle.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Badge */}
          <div className="space-y-2">
            <Label className="text-xs">Badge</Label>
            <div className="flex flex-wrap gap-2">
              {activeBadges.map((badge) => (
                <button
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge.id)}
                  className={cn(
                    "rounded-md border border-border px-3 py-1 text-xs font-medium transition-colors",
                    selectedBadge === badge.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {badge.name}
                </button>
              ))}
            </div>
          </div>

          {/* Score */}
          <div className="space-y-2">
            <Label className="text-xs">Nota final</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="9.0"
              className="w-24 font-mono-nums"
            />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <Label className="text-xs">Review</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Suas impressões finais sobre o jogo..."
              className="min-h-[120px] resize-none text-sm"
            />
          </div>

          <Button className="w-full" disabled={!selectedCycle || !selectedBadge || !score}>
            Salvar Review
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
