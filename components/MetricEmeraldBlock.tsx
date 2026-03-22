import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MetricEmeraldBlockProps = {
  label: string;
  children: ReactNode;
  className?: string;
  valueClassName?: string;
  /** Sobrescreve classes do rótulo (padrão: cinza, legível em qualquer pai). */
  labelClassName?: string;
  /** Centraliza rótulo e valor (ex.: cronômetro). */
  align?: "start" | "center";
};

/** Métricas (tempo, notas, médias, gameplay) — borda esmeralda, estilo alinhado a botão outline. Não usar para notas livres nem para status/badge. */
export function MetricEmeraldBlock({
  label,
  children,
  className,
  valueClassName,
  labelClassName,
  align = "start",
}: MetricEmeraldBlockProps) {
  if (align === "center") {
    return (
      <div
        className={cn(
          "min-w-0 rounded-md border border-emerald-500/30 bg-background px-3 py-3 text-center shadow-sm dark:border-emerald-500/25",
          className,
        )}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div
          className={cn(
            "mt-2 text-sm font-semibold tabular-nums text-foreground",
            valueClassName,
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[2.25rem] min-w-0 items-center justify-between gap-2 rounded-md border border-emerald-500/30 bg-background px-2.5 py-1.5 shadow-sm dark:border-emerald-500/25",
        className,
      )}
    >
      <p
        className={cn(
          "min-w-0 flex-1 text-[11px] font-medium leading-tight !text-muted-foreground",
          labelClassName,
        )}
      >
        {label}
      </p>
      <div
        className={cn(
          "min-w-0 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground",
          valueClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
