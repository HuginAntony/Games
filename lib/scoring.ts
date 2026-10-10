import { BASE_POINTS, TIME_BONUS_PER_SECOND } from '../types/game';
/** 100 base points + 10 per whole second remaining, capped at a 100 point bonus. */
export function calculateScore(secondsRemaining: number, _durationSeconds = 15): number {
  return BASE_POINTS + Math.min(100, Math.floor(Math.max(0, secondsRemaining)) * TIME_BONUS_PER_SECOND);
}
