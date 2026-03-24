/** Tipos parciais da API RAWG (campos usados pelo app). */

export type RawgGenre = {
  id: number;
  name: string;
  slug?: string;
};

export type RawgPlatformNested = {
  id: number;
  name: string;
  slug?: string;
};

export type RawgPlatformEntry = {
  platform: RawgPlatformNested;
};

export type RawgStoreEntry = {
  id?: number;
  url?: string;
  /** Alguns endpoints usam url_en. */
  url_en?: string;
  store?: { id: number; name: string; domain?: string };
};

export type RawgScreenshot = {
  id?: number;
  image: string;
};

export type RawgMovie = {
  id?: number;
  name?: string;
  preview?: string;
  data?: Record<string, string | undefined>;
};

export type RawgCompany = {
  name: string;
};

export type RawgEsrb = {
  id?: number;
  name?: string;
  slug?: string;
};

export type RawgFranchise = {
  id?: number;
  name?: string;
  slug?: string;
};

export type RawgParentGame = {
  id: number;
  name?: string;
  slug?: string;
};

export type RawgPcRequirements = {
  minimum?: string | null;
  recommended?: string | null;
};

/** Item em listagem / busca. */
export type RawgSearchResult = {
  id: number;
  name: string;
  slug: string;
  released?: string | null;
  /** Arte larga (banner); útil com `object-cover` em miniatura. */
  background_image?: string | null;
  /** Primeira entrada costuma funcionar bem como preview na lista. */
  short_screenshots?: RawgScreenshot[];
  rating?: number;
  metacritic?: number | null;
};

export type RawgGamesListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: RawgSearchResult[];
};

/** GET /genres (lista paginada; o servidor agrega todas as páginas). */
export type RawgGenresListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: RawgGenre[];
};

/** Detalhe completo (GET /games/{id}). */
export type RawgGameDetail = {
  id: number;
  name: string;
  slug: string;
  description_raw?: string | null;
  released?: string | null;
  background_image?: string | null;
  background_image_additional?: string | null;
  website?: string | null;
  metacritic?: number | null;
  rating?: number;
  playtime?: number | null;
  updated?: string | null;
  esrb_rating?: RawgEsrb | null;
  genres?: RawgGenre[];
  platforms?: RawgPlatformEntry[];
  stores?: RawgStoreEntry[];
  short_screenshots?: RawgScreenshot[];
  screenshots?: RawgScreenshot[];
  movies?: RawgMovie[];
  developers?: RawgCompany[];
  publishers?: RawgCompany[];
  pc_requirements?: RawgPcRequirements | null;
  franchise?: RawgFranchise | null;
  parent_game?: RawgParentGame | null;
  parent_games?: RawgParentGame[];
  additions_count?: number;
  tags?: { id: number; name: string; slug?: string }[];
};
