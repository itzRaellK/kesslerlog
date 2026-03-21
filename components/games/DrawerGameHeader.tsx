import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DrawerGameHeaderProps = {
  /** Rótulo pequeno acima (ex.: Ciclos, Nova sessão) */
  label: string;
  /** Nome do jogo em destaque */
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
    <div
      className={cn(
        "rounded-xl border border-emerald-500/25 bg-card p-4 shadow-sm",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
        {label}
      </p>
      {gameName ? (
        <h2 className="mt-2 text-xl font-bold leading-snug tracking-tight text-foreground">
          {gameName}
        </h2>
      ) : null}
      {children}
    </div>
  );
}
