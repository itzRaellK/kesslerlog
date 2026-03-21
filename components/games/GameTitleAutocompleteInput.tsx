"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Busca de jogo na biblioteca: digite e escolha um título da lista ou filtre por texto. */
export function GameTitleAutocompleteInput({
  value,
  onChange,
  titles,
  placeholder,
  inputId,
  inputClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Títulos únicos da biblioteca (ordenados). */
  titles: string[];
  placeholder?: string;
  inputId?: string;
  inputClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = !q
      ? titles
      : titles.filter((t) => t.toLowerCase().includes(q));
    return list.slice(0, 12);
  }, [value, titles]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={rootRef} className="relative w-full min-w-[12rem] max-w-xs">
      <Input
        id={inputId}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
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
          {filtered.map((title) => (
            <li key={title} role="option">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(title);
                  setOpen(false);
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
