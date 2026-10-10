'use client';
import { useEffect, useState } from 'react';
import { ROUND_DURATION_MS } from '@/types/game';
/** Derives the timer from the room deadline and server clock; background tabs catch up. */
export function useCountdown(roundStartedAt: number, active: boolean, serverTime?: number, durationMs = ROUND_DURATION_MS): number {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
  useEffect(() => {
    if (!active || !roundStartedAt) { setSecondsLeft(Math.ceil(durationMs / 1000)); return; }
    const offset = serverTime ? serverTime - Date.now() : 0;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((roundStartedAt + durationMs - Date.now() - offset) / 1000)));
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [roundStartedAt, active, serverTime, durationMs]);
  return secondsLeft;
}
