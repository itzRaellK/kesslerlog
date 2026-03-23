import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DrawerGameHeaderProps = {
  /** Título do drawer (ex.: Ciclos, Nova sessão) */
  label: string;
  /** Nome do jogo em chip esmeralda */
  gameName?: string;
  /** `subtitle`: nome abaixo do título (menos poluído em formulários longos). */
  gameNameDisplay?: "chip" | "subtitle";
  /** Um gênero (legado) */
  genreName?: string;
  /** Vários gêneros (prioridade sobre `genreName`) */
  genreNames?: string[];
  className?: string;
  children?: ReactNode;
};

const gameChipClass =
  "inline-flex max-w-full min-w-0 items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold text-emerald-800 dark:text-emerald-300";

export function DrawerGameHeader({
  label,
  gameName,
  gameNameDisplay = "chip",
  genreName,
  genreNames,
  className,
  children,
}: DrawerGameHeaderProps) {
  const genreChips =
    genreNames && genreNames.length > 0
      ? genreNames
      : genreName
        ? [genreName]
        : [];

  const showGameAsSubtitle = gameNameDisplay === "subtitle" && !!gameName;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">
            {label}
          </h2>
          {gameName && !showGameAsSubtitle ? (
            <span className={cn(gameChipClass)}>
              <span className="truncate">{gameName}</span>
            </span>
          ) : null}
          {!showGameAsSubtitle
            ? genreChips.map((g) => (
                <span key={g} className={cn(gameChipClass)}>
                  <span className="truncate">{g}</span>
                </span>
              ))
            : null}
        </div>
        {showGameAsSubtitle ? (
          <p className="truncate text-sm text-muted-foreground" title={gameName}>
            {gameName}
          </p>
        ) : null}
        {showGameAsSubtitle && genreChips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {genreChips.map((g) => (
              <span key={g} className={cn(gameChipClass)}>
                <span className="truncate">{g}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
