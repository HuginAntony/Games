'use client';

import { useEffect, useRef, useState } from 'react';
import { ROUND_DURATION_MS } from '@/types/game';

/**
 * Drives a client-side 10-second countdown derived from the server's roundStartedAt timestamp.
 * Syncs with server time rather than running an independent timer,
 * so late-joiners see the correct remaining time.
 */
export function useCountdown(roundStartedAt: number, active: boolean): number {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || roundStartedAt === 0) {
      setSecondsLeft(10);
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - roundStartedAt;
      const remaining = Math.max(0, Math.ceil((ROUND_DURATION_MS - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [roundStartedAt, active]);

  return secondsLeft;
}
