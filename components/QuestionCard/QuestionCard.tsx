'use client';
import { useEffect } from 'react';
interface QuestionCardProps { question: string; category: string; answers: string[]; correctIndex?: number; selectedIndex: number | null; onAnswer: (index: number) => void; disabled: boolean }
export function QuestionCard({ question, answers, correctIndex, selectedIndex, onAnswer, disabled }: QuestionCardProps) {
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (disabled || event.altKey || event.ctrlKey || event.metaKey || event.repeat || !/^[1-4]$/.test(event.key)) return;
      const target = event.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
      const index = Number(event.key) - 1;
      if (index < answers.length) onAnswer(index);
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [disabled, answers.length, onAnswer]);
  return <><h2 className="question-title" id="question-title">{question}</h2><div className="answer-grid" role="group" aria-labelledby="question-title">{answers.map((answer, index) => {
    const correct = correctIndex === index;
    const wrong = correctIndex !== undefined && selectedIndex === index && !correct;
    return <button className={`answer-card ${selectedIndex === index ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} key={index} onClick={() => onAnswer(index)} disabled={disabled} aria-label={`Answer ${String.fromCharCode(65 + index)}: ${answer}${correct ? ', correct answer' : wrong ? ', your answer, incorrect' : ''}`} aria-pressed={selectedIndex === index}><span className="answer-letter">{String.fromCharCode(65 + index)}</span><span className="answer-text">{answer}<small className="answer-hint">PRESS {index + 1}</small></span>{correct && <span className="answer-mark">✓ Correct</span>}{wrong && <span className="answer-mark">✕ Your choice</span>}</button>;
  })}</div></>;
}
