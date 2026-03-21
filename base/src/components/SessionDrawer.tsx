import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Play, Square } from "lucide-react";

interface SessionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameName?: string;
  cycleName?: string;
}

export function SessionDrawer({ open, onOpenChange, gameName, cycleName }: SessionDrawerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState("");
  const [score, setScore] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setElapsed(0);
    setNote("");
    setScore("");
  }, []);

  useEffect(() => {
    if (!open) resetTimer();
  }, [open, resetTimer]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[450px] sm:max-w-[450px]">
        <SheetHeader>
          <SheetTitle className="text-sm font-semibold">Nova Sessão</SheetTitle>
          {gameName && (
            <p className="text-xs text-muted-foreground">{gameName} • {cycleName}</p>
          )}
        </SheetHeader>

        <div className="mt-8 space-y-6">
          {/* Timer */}
          <div className="flex flex-col items-center gap-4">
            <div className="font-mono-nums text-4xl font-semibold text-primary">
              {pad(hours)}:{pad(minutes)}:{pad(seconds)}
            </div>
            <Button
              onClick={() => setIsRunning(!isRunning)}
              variant={isRunning ? "destructive" : "default"}
              size="sm"
              className="w-32"
            >
              {isRunning ? (
                <><Square className="mr-2 h-3 w-3" /> Parar</>
              ) : (
                <><Play className="mr-2 h-3 w-3" /> Iniciar</>
              )}
            </Button>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label className="text-xs">Resumo da sessão</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="O que você sentiu nessa sessão?"
              className="min-h-[100px] resize-none text-sm"
            />
          </div>

          {/* Score */}
          <div className="space-y-2">
            <Label className="text-xs">Nota da sessão</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="8.5"
              className="w-24 font-mono-nums"
            />
          </div>

          <Button className="w-full" disabled={elapsed === 0}>
            Salvar Sessão
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
