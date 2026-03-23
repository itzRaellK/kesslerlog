/**
 * A API RAWG devolve Metacritic em escala 0–100 (ex.: 92).
 * No app usamos 0–10 com uma casa decimal (ex.: 9,2).
 */
export function rawgMetacriticToAppScore(raw: number): number {
  return Math.round((raw / 10) * 10) / 10;
}
