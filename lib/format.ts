/** Parse para comparar / formatar notas vindas da API (número ou string). */
export function parseNumericScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Notas e médias na UI: casas fixas e parsing seguro (evita `⌀ 7.7444444444444445`
 * quando o valor vem como float ou string da BD).
 */
export function formatNumericScore(value: unknown, decimals = 2): string {
  const n = parseNumericScore(value);
  if (n === null) return "—";
  return n.toFixed(decimals);
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${months[parseInt(month, 10) - 1]}/${year.slice(2)}`;
}
