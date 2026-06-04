export type GamePhase =
  | 'lobby'
  | 'countdown'
  | 'question'
  | 'round-result'
  | 'final-result';

export interface Player {
  id: string;
  nickname: string;
  avatar: string;   // single emoji character
  score: number;
  answeredIndex: number | null; // null = not yet answered this round
  isHost: boolean;
}

export interface Question {
  category: string;
  question: string;
  correctIndex: number; // only present in server state; stripped from client during 'question' phase
  answers: string[];    // shuffled: correct + 3 incorrect
}

/** Version of Question sent to clients during the active round — no correct answer */
export interface ClientQuestion {
  category: string;
  question: string;
  answers: string[];
  /** populated only when phase === 'round-result' */
  correctIndex?: number;
}

export interface GameRoom {
  code: string;
  phase: GamePhase;
  hostId: string;
  players: Record<string, Player>;
  questions: Question[];
  currentQuestionIndex: number;
  roundStartedAt: number; // epoch ms — used to compute time bonus
  maxPlayers: number;
  totalRounds: number;
}

// ─── WebSocket message types ──────────────────────────────────────────────────

export type ClientMessage =
  | { type: 'join'; nickname: string; avatar: string }
  | { type: 'start'; rounds?: number }
  | { type: 'answer'; answerIndex: number };

export type ServerMessage =
  | { type: 'state-update'; room: PublicGameRoom }
  | { type: 'error'; message: string };

/** Room state safe to broadcast to all clients (strips correctIndex during 'question' phase) */
export interface PublicGameRoom {
  code: string;
  phase: GamePhase;
  hostId: string;
  players: Record<string, Player>;
  currentQuestion: ClientQuestion | null;
  currentQuestionIndex: number;
  totalRounds: number;
  roundStartedAt: number;
  maxPlayers: number;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
export const ROUND_DURATION_MS = 10_000;
export const BASE_POINTS = 100;
export const TIME_BONUS_PER_SECOND = 10;
export const MAX_PLAYERS = 12;
export const TOTAL_ROUNDS = 10;
