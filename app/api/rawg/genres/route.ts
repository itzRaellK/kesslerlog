import { NextResponse } from "next/server";
import { getRawgApiKey } from "@/lib/rawg/get-key";
import type { RawgGenre, RawgGenresListResponse } from "@/lib/rawg/types";

const RAWG_BASE = "https://api.rawg.io/api";

/**
 * Lista todos os gêneros catalogados pela RAWG (várias páginas).
 * Usado para sincronizar `genre_types.rawg_id` com a API oficial.
 */
export async function GET() {
  const key = getRawgApiKey();
  if (!key) {
    return NextResponse.json(
      { error: "RAWG_API_KEY ou NEXT_PUBLIC_RAWG_KEY não configurada." },
      { status: 500 },
    );
  }

  const results: RawgGenre[] = [];
  let page = 1;
  const pageSize = 40;
  const maxPages = 50;

  while (page <= maxPages) {
    const url = new URL(`${RAWG_BASE}/genres`);
    url.searchParams.set("key", key);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(pageSize));

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Falha na API RAWG.", detail: text.slice(0, 200) },
        { status: 502 },
      );
    }

    const data = (await res.json()) as RawgGenresListResponse;
    const batch = data.results ?? [];
    results.push(...batch);

    if (!data.next || batch.length === 0) break;
    page += 1;
  }

  return NextResponse.json({ results, count: results.length });
}
