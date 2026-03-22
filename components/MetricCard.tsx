"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type MetricStatRow = { label: string; value: string };

interface MetricCardProps {
  label: string;
  /** Modo compacto: mesma tipografia em todo o card; valores em esmeralda. */
  stats?: MetricStatRow[];
  value?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  lines?: string[];
  icon: LucideIcon;
}

export function MetricCard({
  label,
  stats,
  value,
  change,
  changeType = "neutral",
  lines,
  icon: Icon,
}: MetricCardProps) {
  if (stats && stats.length > 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/90 p-3 shadow-sm">
        <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-border/70 pb-2.5">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <Icon className="h-4 w-4 shrink-0 text-emerald-600/90 dark:text-emerald-400/90" />
        </div>
        <div className="space-y-2">
          {stats.map((row, i) => (
            <div
              key={`${row.label}-${i}`}
              className="flex items-baseline justify-between gap-2 text-sm leading-snug"
            >
              <span className="min-w-0 text-muted-foreground">{row.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/90 p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <Icon className="h-4 w-4 text-emerald-600/90 dark:text-emerald-400/90" />
      </div>
      {value != null && (
        <p className="mt-2.5 text-2xl font-semibold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
          {value}
        </p>
      )}
      {change && (
        <p
          className={cn(
            "mt-1 text-xs",
            changeType === "positive" && "text-positive",
            changeType === "negative" && "text-negative",
            changeType === "neutral" && "text-muted-foreground"
          )}
        >
          {change}
        </p>
      )}
      {lines?.map((line, i) => (
        <p
          key={i}
          className="mt-1 text-xs text-muted-foreground tabular-nums leading-snug"
        >
          {line}
        </p>
      ))}
    </div>
  );
}
