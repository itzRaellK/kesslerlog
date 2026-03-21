import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { genres } from "@/data/mock";
import { Plus, Trash2 } from "lucide-react";

interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddGameDialog({ open, onOpenChange }: AddGameDialogProps) {
  const [title, setTitle] = useState("");
  const [genreId, setGenreId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [externalScores, setExternalScores] = useState<{ source: string; score: string }[]>([]);

  const addScore = () => setExternalScores([...externalScores, { source: "", score: "" }]);
  const removeScore = (i: number) => setExternalScores(externalScores.filter((_, idx) => idx !== i));
  const updateScore = (i: number, field: "source" | "score", value: string) => {
    const updated = [...externalScores];
    updated[i][field] = value;
    setExternalScores(updated);
  };

  const activeGenres = genres.filter((g) => g.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Adicionar Jogo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do jogo" className="text-sm" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Gênero</Label>
            <Select value={genreId} onValueChange={setGenreId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {activeGenres.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Imagem (URL)</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="text-sm" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Notas Externas</Label>
              <Button variant="ghost" size="sm" onClick={addScore} className="h-6 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Adicionar
              </Button>
            </div>
            {externalScores.map((es, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={es.source}
                  onChange={(e) => updateScore(i, "source", e.target.value)}
                  placeholder="Fonte (ex: Metacritic)"
                  className="text-sm"
                />
                <Input
                  type="number"
                  step="0.1"
                  value={es.score}
                  onChange={(e) => updateScore(i, "score", e.target.value)}
                  placeholder="96"
                  className="w-20 text-sm font-mono-nums"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeScore(i)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <Button className="w-full" disabled={!title.trim() || !genreId}>
            Salvar Jogo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
