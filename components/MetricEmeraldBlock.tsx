import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MetricEmeraldBlockProps = {
  label: string;
  children: ReactNode;
  className?: string;
  valueClassName?: string;
  /** Centraliza rótulo e valor (ex.: cronômetro). */
  align?: "start" | "center";
};

/** Métricas (tempo, notas, médias, gameplay) — borda esmeralda, estilo alinhado a botão outline. Não usar para notas livres nem para status/badge. */
export function MetricEmeraldBlock({
  label,
  children,
  className,
  valueClassName,
  align = "start",
}: MetricEmeraldBlockProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-md border border-emerald-500/30 bg-background px-3 py-2 shadow-sm dark:border-emerald-500/25",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums text-foreground",
          align === "center" && "text-center",
          valueClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
