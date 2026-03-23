"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenreRow } from "@/lib/game-genres";

type GenreMultiSelectInputProps = {
  genres: GenreRow[];
  selected: GenreRow[];
  onChange: (next: GenreRow[]) => void;
  placeholder?: string;
  inputId?: string;
  inputClassName?: string;
};

/** Vários gêneros: chips + campo para adicionar da lista cadastrada. */
export function GenreMultiSelectInput({
  genres,
  selected,
  onChange,
  placeholder = "Buscar e adicionar gênero…",
  inputId,
  inputClassName,
}: GenreMultiSelectInputProps) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.id)),
    [selected],
  );

  const suggestions = useMemo(
    () => genres.filter((g) => !selectedIds.has(g.id)),
    [genres, selectedIds],
  );

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = !q
      ? suggestions
      : suggestions.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q),
        );
    return list.slice(0, 12);
  }, [value, suggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addGenre = (g: GenreRow) => {
    onChange([...selected, { id: g.id, name: g.name }]);
    setValue("");
    setOpen(false);
  };

  const removeGenre = (id: string) => {
    onChange(selected.filter((s) => s.id !== id));
  };

  return (
    <div ref={rootRef} className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <Badge
              key={s.id}
              variant="secondary"
              className="gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 pl-2 pr-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-400"
            >
              {s.name}
              <button
                type="button"
                className="rounded p-0.5 hover:bg-emerald-500/20"
                onClick={() => removeGenre(s.id)}
                aria-label={`Remover ${s.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative w-full min-w-0">
        <Input
          id={inputId}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open && filtered.length > 0}
          className={cn(
            "h-10 rounded-lg border-emerald-500/20 bg-background text-sm focus-visible:ring-emerald-500/30",
            inputClassName,
          )}
        />
        {open && filtered.length > 0 && (
          <ul
            className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-card px-0 py-1 text-foreground shadow-md"
            role="listbox"
          >
            {filtered.map((g) => (
              <li key={g.id} role="option">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addGenre(g);
                  }}
                >
                  {g.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
