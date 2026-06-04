'use client';

import { Player } from '@/types/game';
import styles from './Podium.module.css';

interface PodiumProps {
  /** Top players sorted by score descending — at most 3 used */
  players: Player[];
  nickname: string;
}

// Podium order: 2nd (left), 1st (centre), 3rd (right)
const PODIUM_ORDER = [1, 0, 2] as const;
const BAR_HEIGHTS = [130, 180, 100] as const;
const MEDALS = ['🥈', '🥇', '🥉'] as const;

export function Podium({ players, nickname }: PodiumProps) {
  return (
    <div className={styles.podium}>
      {PODIUM_ORDER.map((rankIdx, colIdx) => {
        const player = players[rankIdx];
        const isMe = player?.nickname === nickname;
        const height = BAR_HEIGHTS[colIdx];

        return (
          <div key={colIdx} className={styles.slot}>
            {player ? (
              <>
                <div className={`${styles.playerCard} ${isMe ? styles.meCard : ''}`}>
                  <span className={styles.avatarEmoji}>{player.avatar}</span>
                  <span className={styles.playerName}>{player.nickname}</span>
                  <span className={styles.playerScore}>{player.score.toLocaleString()} pts</span>
                </div>
                <div className={styles.medal}>{MEDALS[colIdx]}</div>
              </>
            ) : (
              <div className={styles.emptyCard} />
            )}
            <div
              className={`${styles.bar} ${player ? styles.barFilled : styles.barEmpty}`}
              style={{
                '--bar-height': `${height}px`,
                animationDelay: `${colIdx * 0.15}s`,
              } as React.CSSProperties}
            />
          </div>
        );
      })}
    </div>
  );
}
