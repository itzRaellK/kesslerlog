export interface Genre {
  id: string;
  name: string;
  active: boolean;
}

export interface GameStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  active: boolean;
}

export interface ExternalScore {
  source: string;
  score: number;
}

export interface Game {
  id: string;
  title: string;
  genre_id: string;
  image_url: string;
  external_scores: ExternalScore[];
  created_at: string;
}

export interface Cycle {
  id: string;
  game_id: string;
  name: string;
  status: "active" | "finished";
  created_at: string;
  finished_at: string | null;
}

export interface Session {
  id: string;
  cycle_id: string;
  game_id: string;
  duration_seconds: number;
  note: string;
  score: number;
  created_at: string;
}

export interface ReviewBadge {
  id: string;
  name: string;
  active: boolean;
}

export interface Review {
  id: string;
  cycle_id: string;
  game_id: string;
  score: number;
  text: string;
  badge_id: string;
  created_at: string;
}

export interface QueueItem {
  id: string;
  game_id: string;
  position: number;
  added_at: string;
}

export const genres: Genre[] = [
  { id: "1", name: "RPG", active: true },
  { id: "2", name: "Action", active: true },
  { id: "3", name: "Adventure", active: true },
  { id: "4", name: "Platformer", active: true },
  { id: "5", name: "Roguelike", active: true },
  { id: "6", name: "Metroidvania", active: true },
  { id: "7", name: "Strategy", active: true },
  { id: "8", name: "Puzzle", active: false },
];

export const gameStatuses: GameStatus[] = [
  { id: "1", name: "Jogando", color: "blue", order: 1, active: true },
  { id: "2", name: "Finalizado", color: "green", order: 2, active: true },
  { id: "3", name: "Abandonado", color: "red", order: 3, active: true },
  { id: "4", name: "Na Fila", color: "yellow", order: 4, active: true },
  { id: "5", name: "Pausado", color: "orange", order: 5, active: true },
];

export const reviewBadges: ReviewBadge[] = [
  { id: "1", name: "Gostei", active: true },
  { id: "2", name: "Não Gostei", active: true },
  { id: "3", name: "Quero Mais", active: true },
  { id: "4", name: "Obra-Prima", active: true },
  { id: "5", name: "Decepcionante", active: true },
];

export const games: Game[] = [
  { id: "1", title: "Elden Ring", genre_id: "1", image_url: "https://picsum.photos/seed/eldenring/160/200", external_scores: [{ source: "Metacritic", score: 96 }, { source: "IGN", score: 10 }], created_at: "2024-11-15" },
  { id: "2", title: "Baldur's Gate 3", genre_id: "1", image_url: "https://picsum.photos/seed/bg3/160/200", external_scores: [{ source: "Metacritic", score: 96 }], created_at: "2024-12-01" },
  { id: "3", title: "The Last of Us Part II", genre_id: "2", image_url: "https://picsum.photos/seed/tlou2/160/200", external_scores: [{ source: "Metacritic", score: 93 }], created_at: "2025-01-10" },
  { id: "4", title: "Hades", genre_id: "5", image_url: "https://picsum.photos/seed/hades/160/200", external_scores: [{ source: "Metacritic", score: 93 }], created_at: "2025-01-20" },
  { id: "5", title: "Celeste", genre_id: "4", image_url: "https://picsum.photos/seed/celeste/160/200", external_scores: [{ source: "Metacritic", score: 92 }], created_at: "2025-02-05" },
  { id: "6", title: "Hollow Knight", genre_id: "6", image_url: "https://picsum.photos/seed/hollowknight/160/200", external_scores: [{ source: "Metacritic", score: 90 }], created_at: "2025-02-15" },
  { id: "7", title: "God of War Ragnarök", genre_id: "2", image_url: "https://picsum.photos/seed/gowr/160/200", external_scores: [{ source: "Metacritic", score: 94 }], created_at: "2025-03-01" },
  { id: "8", title: "Cyberpunk 2077", genre_id: "1", image_url: "https://picsum.photos/seed/cyberpunk/160/200", external_scores: [{ source: "Metacritic", score: 86 }, { source: "IGN", score: 9 }], created_at: "2025-03-10" },
];

export const cycles: Cycle[] = [
  { id: "1", game_id: "1", name: "Primeira Jornada", status: "finished", created_at: "2024-11-15", finished_at: "2025-01-20" },
  { id: "2", game_id: "2", name: "Campanha Principal", status: "active", created_at: "2024-12-01", finished_at: null },
  { id: "3", game_id: "3", name: "Playthrough Completo", status: "finished", created_at: "2025-01-10", finished_at: "2025-02-28" },
  { id: "4", game_id: "4", name: "Runs Iniciais", status: "active", created_at: "2025-01-20", finished_at: null },
  { id: "5", game_id: "7", name: "História Principal", status: "active", created_at: "2025-03-01", finished_at: null },
];

export const sessions: Session[] = [
  { id: "1", cycle_id: "1", game_id: "1", duration_seconds: 7200, note: "Primeiras horas explorando Limgrave. O mundo aberto é impressionante.", score: 8.5, created_at: "2024-11-16T20:00:00" },
  { id: "2", cycle_id: "1", game_id: "1", duration_seconds: 10800, note: "Derrotei Margit. Combate muito satisfatório.", score: 9.0, created_at: "2024-11-18T19:00:00" },
  { id: "3", cycle_id: "1", game_id: "1", duration_seconds: 5400, note: "Explorando Stormveil Castle. Design de level incrível.", score: 9.2, created_at: "2024-11-20T21:00:00" },
  { id: "4", cycle_id: "2", game_id: "2", duration_seconds: 14400, note: "Criação de personagem e Ato 1. Narrativa envolvente desde o início.", score: 9.5, created_at: "2024-12-02T18:00:00" },
  { id: "5", cycle_id: "2", game_id: "2", duration_seconds: 9000, note: "Explorando o acampamento. Sistema de companions é excelente.", score: 9.0, created_at: "2024-12-05T20:00:00" },
  { id: "6", cycle_id: "3", game_id: "3", duration_seconds: 7200, note: "Início intenso. A narrativa já me prendeu completamente.", score: 8.8, created_at: "2025-01-12T19:30:00" },
  { id: "7", cycle_id: "3", game_id: "3", duration_seconds: 10800, note: "Seattle Day 1. O level design é surpreendente.", score: 9.1, created_at: "2025-01-15T20:00:00" },
  { id: "8", cycle_id: "4", game_id: "4", duration_seconds: 3600, note: "Primeiras runs. O gameplay loop é viciante.", score: 8.7, created_at: "2025-01-22T22:00:00" },
  { id: "9", cycle_id: "4", game_id: "4", duration_seconds: 5400, note: "Começando a entender os builds. Muito divertido.", score: 8.9, created_at: "2025-01-25T21:00:00" },
  { id: "10", cycle_id: "5", game_id: "7", duration_seconds: 10800, note: "Início épico. Os reinos são lindos.", score: 9.3, created_at: "2025-03-02T19:00:00" },
  { id: "11", cycle_id: "5", game_id: "7", duration_seconds: 7200, note: "Combate fluído, puzzle dos reinos são interessantes.", score: 8.8, created_at: "2025-03-05T20:30:00" },
  { id: "12", cycle_id: "5", game_id: "7", duration_seconds: 9000, note: "Boss fight incrível. A narrativa está ficando intensa.", score: 9.4, created_at: "2025-03-10T19:00:00" },
];

export const reviews: Review[] = [
  { id: "1", cycle_id: "1", game_id: "1", score: 9.5, text: "Uma obra-prima dos action RPGs. O mundo aberto redefine o gênero com sua liberdade e design magistral. Cada região surpreende com novos desafios e segredos.", badge_id: "4", created_at: "2025-01-21" },
  { id: "2", cycle_id: "3", game_id: "3", score: 9.0, text: "Narrativa poderosa e gameplay refinado. A história desafia expectativas e o combate evoluiu significativamente. Alguns momentos de pacing poderiam ser melhores.", badge_id: "1", created_at: "2025-03-01" },
];

export const queue: QueueItem[] = [
  { id: "1", game_id: "5", position: 1, added_at: "2025-03-01" },
  { id: "2", game_id: "6", position: 2, added_at: "2025-03-05" },
  { id: "3", game_id: "8", position: 3, added_at: "2025-03-10" },
];

// Helpers
export const getGameById = (id: string) => games.find((g) => g.id === id);
export const getGenreById = (id: string) => genres.find((g) => g.id === id);
export const getStatusById = (id: string) => gameStatuses.find((s) => s.id === id);
export const getBadgeById = (id: string) => reviewBadges.find((b) => b.id === id);
export const getCyclesByGameId = (gameId: string) => cycles.filter((c) => c.game_id === gameId);
export const getSessionsByCycleId = (cycleId: string) => sessions.filter((s) => s.cycle_id === cycleId);
export const getSessionsByGameId = (gameId: string) => sessions.filter((s) => s.game_id === gameId);
export const getReviewsByGameId = (gameId: string) => reviews.filter((r) => r.game_id === gameId);

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

export function getTotalDuration(sessionsList: Session[]): number {
  return sessionsList.reduce((acc, s) => acc + s.duration_seconds, 0);
}

export function getAverageScore(items: { score: number }[]): number {
  if (items.length === 0) return 0;
  return Number((items.reduce((acc, s) => acc + s.score, 0) / items.length).toFixed(1));
}
