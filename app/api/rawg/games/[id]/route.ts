import { NextResponse } from "next/server";
import { getRawgApiKey } from "@/lib/rawg/get-key";
import type { RawgGameDetail } from "@/lib/rawg/types";

const RAWG_BASE = "https://api.rawg.io/api";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteParams) {
  const key = getRawgApiKey();
  if (!key) {
    return NextResponse.json(
      { error: "RAWG_API_KEY ou NEXT_PUBLIC_RAWG_KEY não configurada." },
      { status: 500 },
    );
  }

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const url = `${RAWG_BASE}/games/${id}?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Jogo não encontrado ou API indisponível.", detail: text.slice(0, 200) },
      { status: res.status === 404 ? 404 : 502 },
    );
  }

  const data = (await res.json()) as RawgGameDetail;
  return NextResponse.json(data);
}
