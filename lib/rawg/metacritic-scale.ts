/**
 * A API RAWG devolve Metacritic em escala 0–100 (ex.: 92).
 * No app usamos 0–10 com uma casa decimal (ex.: 9,2).
 */
export function rawgMetacriticToAppScore(raw: number): number {
  return Math.round((raw / 10) * 10) / 10;
}

/** Rótulo em `game_external_scores.source` para o Metascore vindo da RAWG. */
export const RAWG_METACRITIC_SCORE_SOURCE = "Metacritic - Metascore";

/** Evita duplicar ao importar se já existir "Metacritic" (legado) ou o rótulo atual. */
export function isMetacriticScoreSource(source: string): boolean {
  const t = source.trim().toLowerCase();
  return (
    t === "metacritic" ||
    t === RAWG_METACRITIC_SCORE_SOURCE.toLowerCase()
  );
}
