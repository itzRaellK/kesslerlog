"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GenreRow } from "@/lib/game-genres";

export type { GenreRow };

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
  maxVisible = 12,
  maxExpanded = 400,
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
  maxVisible?: number;
  maxExpanded?: number;
}) {
  const [open, setOpen] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
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
    const cap = showAllSuggestions
      ? Math.min(maxExpanded, list.length)
      : maxVisible;
    return list.slice(0, Math.max(cap, 0));
  }, [value, suggestions, maxVisible, maxExpanded, showAllSuggestions]);

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
    setShowAllSuggestions(false);
  };

  const hasValue = value.trim().length > 0 || Boolean(selectedId);
  const listOpen = open && filtered.length > 0;

  const clearField = () => {
    onChange("");
    onIdChange("");
    setShowAllSuggestions(false);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <div className="relative flex items-center">
        <Input
          id={inputId}
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            setShowAllSuggestions(false);
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
          aria-expanded={listOpen}
          className={cn(
            "h-10 rounded-lg border-emerald-500/20 bg-background pr-[4.25rem] text-sm focus-visible:ring-emerald-500/30",
            inputClassName,
          )}
        />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {hasValue ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Limpar"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearField}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground",
              open && "text-foreground",
            )}
            aria-label="Mostrar gêneros"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowAllSuggestions(true);
              setOpen((o) => !o);
            }}
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            />
          </Button>
        </div>
      </div>
      {listOpen && (
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
