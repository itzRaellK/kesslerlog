export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface GenreType {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusType {
  id: string;
  name: string;
  color: string | null;
  order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewBadgeType {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  user_id: string;
  title: string;
  genre_type_id: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameExternalScore {
  id: string;
  game_id: string;
  source: string;
  score: number;
  created_at: string;
}

export interface Cycle {
  id: string;
  game_id: string;
  user_id: string;
  name: string;
  status_type_id: string;
  created_at: string;
  finished_at: string | null;
}

export interface Session {
  id: string;
  cycle_id: string;
  game_id: string;
  user_id: string;
  duration_seconds: number;
  note: string | null;
  score: number;
  created_at: string;
}

export interface Review {
  id: string;
  cycle_id: string;
  game_id: string;
  user_id: string;
  score: number;
  text: string | null;
  review_badge_type_id: string;
  created_at: string;
}

export interface WaitlistItem {
  id: string;
  user_id: string;
  game_id: string;
  position: number;
  added_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  /** Nome exibido no app (avatar, etc.); opcional. */
  display_name: string | null;
  is_superadmin: boolean;
  created_at: string;
  updated_at: string;
}

export interface GamesWithDetailsRow {
  id: string;
  user_id: string;
  title: string;
  image_url: string | null;
  created_at: string;
  genre_type_id: string;
  genre_name: string;
  sessions_count: number;
  total_duration_seconds: number;
  avg_session_score: number;
  avg_review_score: number;
}
