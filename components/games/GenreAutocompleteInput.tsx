"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type GenreRow = { id: string; name: string };

/** Campo de texto com sugestões ao digitar (lista de gêneros cadastrados). */
export function GenreAutocompleteInput({
  value,
  onChange,
  genres,
  selectedId,
  onIdChange,
  placeholder,
  inputId,
  inputClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  genres: GenreRow[];
  /** id do gênero selecionado; vazio = nenhum */
  selectedId: string;
  onIdChange: (nextId: string) => void;
  placeholder?: string;
  inputId?: string;
  inputClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(
    () =>
      genres.map((g) => ({
        label: g.name,
        id: g.id,
      })),
    [genres],
  );

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = !q
      ? suggestions
      : suggestions.filter(
          (s) =>
            s.label.toLowerCase().includes(q) ||
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

  const applySelection = (name: string, genreId: string) => {
    onChange(name);
    onIdChange(genreId);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <Input
        id={inputId}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          if (selectedId) {
            const match = genres.find((g) => g.id === selectedId);
            if (!match || match.name !== next) {
              onIdChange("");
            }
          }
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          const t = value.trim();
          if (!t) {
            onIdChange("");
            return;
          }
          const exact = genres.find(
            (g) => g.name.toLowerCase() === t.toLowerCase(),
          );
          if (exact) {
            onIdChange(exact.id);
            onChange(exact.name);
          } else {
            onIdChange("");
          }
        }}
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
          {filtered.map((s) => (
            <li key={s.id} role="option">
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                  selectedId === s.id &&
                    "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySelection(s.label, s.id);
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
