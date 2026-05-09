"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Busca de jogo na biblioteca: digite e escolha um título da lista ou filtre por texto. */
export function GameTitleAutocompleteInput({
  value,
  onChange,
  titles,
  placeholder,
  inputId,
  inputClassName,
  maxVisible = 12,
  maxExpanded = 400,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Títulos únicos da biblioteca (ordenados). */
  titles: string[];
  placeholder?: string;
  inputId?: string;
  inputClassName?: string;
  maxVisible?: number;
  maxExpanded?: number;
}) {
  const [open, setOpen] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = !q
      ? titles
      : titles.filter((t) => t.toLowerCase().includes(q));
    const cap = showAllSuggestions
      ? Math.min(maxExpanded, list.length)
      : maxVisible;
    return list.slice(0, Math.max(cap, 0));
  }, [value, titles, maxVisible, maxExpanded, showAllSuggestions]);

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

  return (
    <div ref={rootRef} className="relative w-full min-w-[12rem] max-w-xs">
      <div className="relative flex items-center">
        <Input
          id={inputId}
          value={value}
          onChange={(e) => {
            setShowAllSuggestions(false);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
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
              onClick={() => {
                onChange("");
                setShowAllSuggestions(false);
                setOpen(false);
              }}
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
            aria-label="Mostrar títulos"
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
          {filtered.map((title) => (
            <li key={title} role="option">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(title);
                  setOpen(false);
                  setShowAllSuggestions(false);
                }}
              >
                {title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
