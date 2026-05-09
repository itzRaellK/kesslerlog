"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SuggestItem } from "@/lib/autocomplete-types";

export type { SuggestItem };

type AutocompleteFilterInputProps = {
  value: string;
  onChange: (v: string) => void;
  suggestions: SuggestItem[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  maxVisible?: number;
  /** Ao expandir pela seta, limite superior de itens (evita listas gigantes). */
  maxExpanded?: number;
  dropdownClassName?: string;
  id?: string;
  "aria-labelledby"?: string;
  onBlur?: () => void;
  /** Se definido, o botão ✕ chama isto em vez de `onChange("")`. */
  onClear?: () => void;
};

/** Input com lista de sugestões ao digitar; ✕ limpa; seta abre lista completa filtrável. */
export function AutocompleteFilterInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  inputClassName,
  maxVisible = 8,
  maxExpanded = 400,
  dropdownClassName,
  id,
  "aria-labelledby": ariaLabelledBy,
  onBlur,
  onClear,
}: AutocompleteFilterInputProps) {
  const [open, setOpen] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = !q
      ? suggestions
      : suggestions.filter((s) => {
          const extra = (s.searchExtra ?? "").toLowerCase();
          return (
            s.label.toLowerCase().includes(q) ||
            s.value.toLowerCase().includes(q) ||
            extra.includes(q)
          );
        });
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

  const hasValue = value.trim().length > 0;
  const listOpen = open && filtered.length > 0;

  const handleClear = () => {
    if (onClear) onClear();
    else onChange("");
    setShowAllSuggestions(false);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative flex items-center">
        <Input
          id={id}
          aria-labelledby={ariaLabelledBy}
          value={value}
          onChange={(e) => {
            setShowAllSuggestions(false);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            onBlur?.();
          }}
          placeholder={placeholder}
          className={cn(
            "h-10 rounded-lg border-emerald-500/20 bg-background pr-[4.25rem] text-sm focus-visible:ring-emerald-500/30",
            inputClassName,
          )}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={listOpen}
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
              onClick={handleClear}
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
            aria-label="Mostrar opções"
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
          className={cn(
            "absolute z-50 mt-1 w-full overflow-auto rounded-lg border border-border bg-card px-0 py-1 text-foreground shadow-md max-h-48",
            dropdownClassName,
          )}
          role="listbox"
        >
          {filtered.map((s, i) => (
            <li key={`${s.value}-${s.label}-${i}`} role="option">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s.value);
                  setOpen(false);
                  setShowAllSuggestions(false);
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
