'use client';

import { useState, useEffect } from 'react';
import styles from './QuestionCard.module.css';

interface QuestionCardProps {
  question: string;
  category: string;
  answers: string[];
  correctIndex?: number;
  selectedIndex: number | null;
  onAnswer: (index: number) => void;
  disabled: boolean;
}

export function QuestionCard({
  question,
  category,
  answers,
  correctIndex,
  selectedIndex,
  onAnswer,
  disabled,
}: QuestionCardProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (correctIndex !== undefined) {
      // Trigger flip reveal animation
      const t = setTimeout(() => setRevealed(true), 50);
      return () => clearTimeout(t);
    } else {
      setRevealed(false);
    }
  }, [correctIndex]);

  function getAnswerClass(idx: number): string {
    const classes = [styles.answerBtn];
    if (selectedIndex === idx) classes.push(styles.selected);
    if (revealed && correctIndex !== undefined) {
      if (idx === correctIndex) classes.push(styles.correct);
      else if (idx === selectedIndex) classes.push(styles.wrong);
    }
    return classes.join(' ');
  }

  return (
    <div className={styles.card}>
      <div className={styles.category}>{category}</div>
      <div className={styles.question} dangerouslySetInnerHTML={{ __html: question }} />
      <div className={styles.answers}>
        {answers.map((answer, idx) => (
          <button
            key={idx}
            className={getAnswerClass(idx)}
            onClick={() => !disabled && onAnswer(idx)}
            disabled={disabled}
            aria-label={`Answer ${idx + 1}: ${answer}`}
          >
            <span className={styles.answerLabel}>{String.fromCharCode(65 + idx)}</span>
            <span dangerouslySetInnerHTML={{ __html: answer }} />
          </button>
        ))}
      </div>
    </div>
  );
}
