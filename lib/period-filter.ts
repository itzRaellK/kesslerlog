import type { SuggestItem } from "@/lib/autocomplete-types";

export const FILTER_MONTH_ALL_LABEL = "Todos os meses";
export const FILTER_YEAR_ALL_LABEL = "Todos os anos";

export type ResolvedMonthFilter = "all" | number;
export type ResolvedYearFilter = "all" | number;

/** Índice 0 = Janeiro … 11 = Dezembro (labels PT completos). */
export const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

const MONTH_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

const MONTH_LONG_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export const HOME_MONTH_ROWS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: MONTH_NAMES_PT[i],
}));

export function homeMonthSuggestItems(): SuggestItem[] {
  const rows = HOME_MONTH_ROWS.map((m, i) => ({
    label: m.label,
    value: m.label,
    searchExtra: `${m.value} ${String(m.value).padStart(2, "0")} ${MONTH_SHORT[i]} ${MONTH_LONG_PT[i]}`,
  }));
  return [
    {
      label: FILTER_MONTH_ALL_LABEL,
      value: FILTER_MONTH_ALL_LABEL,
      searchExtra: "todos meses 12",
    },
    ...rows,
  ];
}

export function yearSuggestItems(): SuggestItem[] {
  const y = new Date().getFullYear();
  const years = Array.from({ length: 25 }, (_, i) => {
    const yr = String(y - i);
    return { label: yr, value: yr, searchExtra: yr };
  });
  return [
    {
      label: FILTER_YEAR_ALL_LABEL,
      value: FILTER_YEAR_ALL_LABEL,
      searchExtra: "todos anos",
    },
    ...years,
  ];
}

export function resolveMonthFilter(
  text: string,
  items: SuggestItem[],
  fallback: ResolvedMonthFilter,
): ResolvedMonthFilter {
  const t = text.trim().toLowerCase();
  if (!t) return fallback;
  if (FILTER_MONTH_ALL_LABEL.toLowerCase() === t) return "all";
  const exact = items.find(
    (s) => s.label.toLowerCase() === t || s.value.toLowerCase() === t,
  );
  if (exact) {
    if (
      exact.value === FILTER_MONTH_ALL_LABEL ||
      exact.label === FILTER_MONTH_ALL_LABEL
    )
      return "all";
    const idx = HOME_MONTH_ROWS.findIndex((m) => m.label === exact.value);
    return idx >= 0 ? idx + 1 : fallback;
  }
  const filtered = items.filter(
    (s) =>
      s.label.toLowerCase().includes(t) ||
      (s.searchExtra ?? "").toLowerCase().includes(t),
  );
  if (filtered.length === 1) {
    const f = filtered[0];
    if (
      f.value === FILTER_MONTH_ALL_LABEL ||
      f.label === FILTER_MONTH_ALL_LABEL
    )
      return "all";
    const idx = HOME_MONTH_ROWS.findIndex((m) => m.label === f.value);
    return idx >= 0 ? idx + 1 : fallback;
  }
  return fallback;
}

export function resolveYearFilter(
  text: string,
  fallback: ResolvedYearFilter,
): ResolvedYearFilter {
  const t = text.trim();
  if (!t) return fallback;
  if (FILTER_YEAR_ALL_LABEL.toLowerCase() === t.toLowerCase()) return "all";
  const n = parseInt(t, 10);
  if (!Number.isNaN(n) && n >= 1990 && n <= 2100) return n;
  return fallback;
}

/** Filtro de data para sessões/reviews (created_at ISO). */
export function recordMatchesPeriod(
  iso: string,
  month: ResolvedMonthFilter,
  year: ResolvedYearFilter,
): boolean {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (year !== "all" && y !== year) return false;
  if (month !== "all" && m !== month) return false;
  return true;
}

export function periodLabelPt(
  month: ResolvedMonthFilter,
  year: ResolvedYearFilter,
): string | null {
  if (year === "all" && month === "all") return null;
  if (year !== "all" && month === "all")
    return `${year} (todos os meses)`;
  if (year !== "all" && typeof month === "number")
    return `${MONTH_NAMES_PT[month - 1]} de ${year}`;
  if (year === "all" && typeof month === "number")
    return `${MONTH_NAMES_PT[month - 1]} (todos os anos)`;
  return null;
}
