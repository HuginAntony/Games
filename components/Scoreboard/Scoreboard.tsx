'use client';

import { useRef, useEffect, useState } from 'react';
import { Player } from '@/types/game';
import styles from './Scoreboard.module.css';

interface DeltaEntry { amount: number; key: number }

interface ScoreboardProps {
  players: Record<string, Player>;
  currentPlayerId?: string;
  /** Show answered/waiting dot per player during the question phase */
  showAnswered?: boolean;
  /** Horizontal chip strip layout used above the question card */
  compact?: boolean;
}

export function Scoreboard({ players, currentPlayerId, showAnswered, compact }: ScoreboardProps) {
  const sorted = Object.values(players).sort((a, b) => b.score - a.score);
  const prevScores = useRef<Record<string, number>>({});
  const deltaKey = useRef(0);
  const [deltas, setDeltas] = useState<Record<string, DeltaEntry>>({});

  // Detect score gains and show floating +N delta
  const playersKey = Object.values(players).map(p => `${p.id}:${p.score}`).join(',');
  useEffect(() => {
    const additions: Record<string, DeltaEntry> = {};
    let hasNew = false;
    for (const p of Object.values(players)) {
      const prev = prevScores.current[p.id];
      if (prev !== undefined && p.score > prev) {
        hasNew = true;
        additions[p.id] = { amount: p.score - prev, key: ++deltaKey.current };
      }
      prevScores.current[p.id] = p.score;
    }
    if (!hasNew) return;
    setDeltas(d => ({ ...d, ...additions }));
    const snapshot = { ...additions };
    const t = setTimeout(() => {
      setDeltas(d => {
        const next = { ...d };
        for (const [id, { key }] of Object.entries(snapshot)) {
          if (next[id]?.key === key) delete next[id];
        }
        return next;
      });
    }, 1100);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playersKey]);

  if (compact) {
    return (
      <div className={styles.strip}>
        {sorted.map((player) => (
          <div
            key={player.id}
            className={`${styles.chip} ${player.id === currentPlayerId ? styles.chipMe : ''}`}
          >
            {deltas[player.id] && (
              <span className={styles.delta} key={deltas[player.id].key}>
                +{deltas[player.id].amount}
              </span>
            )}
            <span className={styles.chipAvatar}>{player.avatar}</span>
            <div className={styles.chipInfo}>
              <span className={styles.chipName}>{player.nickname}</span>
              <span className={styles.chipScore}>{player.score.toLocaleString()}</span>
            </div>
            {showAnswered && (
              player.answeredIndex !== null
                ? <span className={styles.answeredDot} title="Answered" />
                : <span className={styles.waitingDot} title="Thinking…" />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.board}>
      <h3 className={styles.title}>Scores</h3>
      <ul className={styles.list}>
        {sorted.map((player, idx) => {
          const pulsing = (deltas[player.id]?.amount ?? 0) > 0;
          return (
            <li
              key={player.id}
              className={`${styles.row} ${player.id === currentPlayerId ? styles.me : ''}`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <span className={styles.rank}>#{idx + 1}</span>
              <span className={styles.avatar}>{player.avatar}</span>
              <span className={styles.name}>{player.nickname}</span>
              {showAnswered && (
                player.answeredIndex !== null
                  ? <span className={styles.answeredDot} title="Answered" />
                  : <span className={styles.waitingDot} title="Thinking…" />
              )}
              <span className={`${styles.score} ${pulsing ? styles.scorePulse : ''}`}>
                {player.score.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
