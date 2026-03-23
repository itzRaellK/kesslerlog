/** Chave RAWG: preferir variável só servidor; fallback para NEXT_PUBLIC (dev). */
export function getRawgApiKey(): string | null {
  const k =
    process.env.RAWG_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_RAWG_KEY?.trim();
  return k || null;
}
