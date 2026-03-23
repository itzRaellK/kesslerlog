import { NextResponse } from "next/server";
import { getRawgApiKey } from "@/lib/rawg/get-key";
import type { RawgGamesListResponse } from "@/lib/rawg/types";

const RAWG_BASE = "https://api.rawg.io/api";

export async function GET(request: Request) {
  const key = getRawgApiKey();
  if (!key) {
    return NextResponse.json(
      { error: "RAWG_API_KEY ou NEXT_PUBLIC_RAWG_KEY não configurada." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json(
      { error: "Informe pelo menos 2 caracteres para buscar." },
      { status: 400 },
    );
  }

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    40,
    Math.max(5, Number(searchParams.get("page_size")) || 15),
  );

  const url = new URL(`${RAWG_BASE}/games`);
  url.searchParams.set("key", key);
  url.searchParams.set("search", q);
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

  const data = (await res.json()) as RawgGamesListResponse;
  return NextResponse.json(data);
}
