export type GamePhase = 'lobby' | 'countdown' | 'question' | 'round-result' | 'final-result';
export const CATEGORY_OPTIONS = [
  { value: 'mixed', label: 'Mixed bag', icon: '✨' }, { value: 'science', label: 'Science', icon: '🔬' },
  { value: 'history', label: 'History', icon: '🏛️' }, { value: 'geography', label: 'Geography', icon: '🌍' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' }, { value: 'sports', label: 'Sports', icon: '🏆' },
] as const;
export type Category = typeof CATEGORY_OPTIONS[number]['value'];
export interface GameSettings {
  rounds: 5 | 10 | 15 | 20;
  category: Category;
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard';
  questionSeconds: 10 | 15 | 20 | 30;
  revealSeconds: 5 | 8 | 12;
}
export const DEFAULT_SETTINGS: GameSettings = { rounds: 10, category: 'mixed', difficulty: 'mixed', questionSeconds: 15, revealSeconds: 8 };
export interface Player {
  id: string; nickname: string; avatar: string; score: number; answeredIndex: number | null;
  answered: boolean; isHost: boolean; connected: boolean; ready: boolean; roundPoints: number;
  correctCount: number; streak: number; bestStreak: number;
}
export interface Question {
  category: string; question: string; correctIndex: number; answers: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}
export interface ClientQuestion extends Omit<Question, 'correctIndex'> { correctIndex?: number }
export type QuestionSource = 'opentdb' | 'curated';
export interface GameRoom {
  code: string; phase: GamePhase; hostId: string; players: Record<string, Player>; questions: Question[];
  currentQuestionIndex: number; roundStartedAt: number; phaseEndsAt: number; maxPlayers: number;
  totalRounds: number; settings: GameSettings; questionSource: QuestionSource | null; starting: boolean;
  answerTimes: Record<string, number>;
}
export interface PublicGameRoom extends Omit<GameRoom, 'questions' | 'answerTimes'> {
  currentQuestion: ClientQuestion | null; serverTime: number;
}
export type ClientMessage =
  | { type: 'join'; nickname: string; avatar: string; create?: boolean; session?: string }
  | { type: 'settings'; settings: Partial<GameSettings> }
  | { type: 'ready'; ready: boolean }
  | { type: 'start'; rounds?: number }
  | { type: 'answer'; answerIndex: number; questionIndex?: number }
  | { type: 'rematch' } | { type: 'leave' };
export type ServerMessage =
  | { type: 'state-update'; room: PublicGameRoom; selfId?: string; ownAnswer?: number | null }
  | { type: 'answer-accepted'; answerIndex: number; questionIndex: number }
  | { type: 'error'; message: string };
export const ROUND_DURATION_MS = 15_000;
export const BASE_POINTS = 100;
export const TIME_BONUS_PER_SECOND = 10;
export const MAX_PLAYERS = 12;
export const TOTAL_ROUNDS = 10;
