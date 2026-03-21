"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SuggestItem = {
  label: string;
  value: string;
  /** Texto extra para busca sem aparecer na lista */
  searchExtra?: string;
};

type AutocompleteFilterInputProps = {
  value: string;
  onChange: (v: string) => void;
  suggestions: SuggestItem[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  maxVisible?: number;
  dropdownClassName?: string;
  id?: string;
  "aria-labelledby"?: string;
  onBlur?: () => void;
};

/** Input com lista de sugestões ao digitar (match por texto); foco abre a lista filtrada. */
export function AutocompleteFilterInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  inputClassName,
  maxVisible = 8,
  dropdownClassName,
  id,
  "aria-labelledby": ariaLabelledBy,
  onBlur,
}: AutocompleteFilterInputProps) {
  const [open, setOpen] = useState(false);
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
    return list.slice(0, maxVisible);
  }, [value, suggestions, maxVisible]);

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
    <div ref={rootRef} className={cn("relative", className)}>
      <Input
        id={id}
        aria-labelledby={ariaLabelledBy}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          onBlur?.();
        }}
        placeholder={placeholder}
        className={cn(
          "h-10 rounded-lg border-emerald-500/20 bg-background text-sm focus-visible:ring-emerald-500/30",
          inputClassName,
        )}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && filtered.length > 0}
      />
      {open && filtered.length > 0 && (
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
