'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '@/types/game';
import styles from './TrophyBanner.module.css';

interface TrophyBannerProps {
  winner: Player;
  isCurrentPlayer: boolean;
}

export function TrophyBanner({ winner, isCurrentPlayer }: TrophyBannerProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (!isCurrentPlayer || fired.current) return;
    fired.current = true;

    // Confetti burst from both sides
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...opts,
        origin: { y: 0.6 },
        particleCount: Math.floor(200 * particleRatio),
      });
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, [isCurrentPlayer]);

  return (
    <div className={styles.banner}>
      <div className={styles.trophy} aria-hidden="true">🏆</div>
      <div className={styles.winnerAvatar}>{winner.avatar}</div>
      <div className={styles.winnerName}>{winner.nickname}</div>
      <div className={styles.winnerLabel}>
        {isCurrentPlayer ? 'You won!' : 'Winner!'}
      </div>
      <div className={styles.winnerScore}>{winner.score.toLocaleString()} pts</div>
    </div>
  );
}
