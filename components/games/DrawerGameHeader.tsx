import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DrawerGameHeaderProps = {
  /** Título do drawer (ex.: Ciclos, Nova sessão) */
  label: string;
  /** Nome do jogo em chip esmeralda */
  gameName?: string;
  /** Gênero (ou rótulo secundário) em chip ao lado do nome, mesmo estilo */
  genreName?: string;
  className?: string;
  children?: ReactNode;
};

const gameChipClass =
  "inline-flex max-w-full min-w-0 items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold text-emerald-800 dark:text-emerald-300";

export function DrawerGameHeader({
  label,
  gameName,
  genreName,
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
          <span className={cn(gameChipClass)}>
            <span className="truncate">{gameName}</span>
          </span>
        ) : null}
        {genreName ? (
          <span className={cn(gameChipClass)}>
            <span className="truncate">{genreName}</span>
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
