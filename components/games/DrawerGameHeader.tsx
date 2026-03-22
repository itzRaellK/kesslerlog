import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DrawerGameHeaderProps = {
  /** Título do drawer (ex.: Ciclos, Nova sessão) */
  label: string;
  /** Nome do jogo em chip esmeralda */
  gameName?: string;
  className?: string;
  children?: ReactNode;
};

export function DrawerGameHeader({
  label,
  gameName,
  className,
  children,
}: DrawerGameHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">
          {label}
        </h2>
        {gameName ? (
          <span
            className={cn(
              "inline-flex max-w-full min-w-0 items-center rounded-md border border-emerald-500/35",
              "bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold text-emerald-800 dark:text-emerald-300",
            )}
          >
            <span className="truncate">{gameName}</span>
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
