'use client';

import styles from './CountdownRing.module.css';

interface CountdownRingProps {
  secondsLeft: number;
  total?: number;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CountdownRing({ secondsLeft, total = 10 }: CountdownRingProps) {
  const progress = secondsLeft / total; // 1 → 0
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const color =
    secondsLeft > 6
      ? 'var(--neon-cyan)'
      : secondsLeft > 3
      ? 'var(--neon-orange)'
      : 'var(--neon-red)';

  return (
    <div className={styles.wrapper} aria-label={`${secondsLeft} seconds left`}>
      <svg width="100" height="100" viewBox="0 0 100 100" className={styles.svg}>
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className={styles.arc}
          style={{ stroke: color }}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span className={styles.number} style={{ color }}>
        {secondsLeft}
      </span>
    </div>
  );
}
