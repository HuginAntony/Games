import { BASE_POINTS, TIME_BONUS_PER_SECOND } from '@/types/game';

/**
 * Strategy: time-bonus scoring.
 * 100 base points + 10 per second remaining on the clock.
 * Maximum: 100 + (10 * 10) = 200 points per question.
 */
export function calculateScore(secondsRemaining: number): number {
  const clamped = Math.max(0, Math.min(10, secondsRemaining));
  return BASE_POINTS + clamped * TIME_BONUS_PER_SECOND;
}
