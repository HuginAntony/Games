'use client';
import { useEffect } from 'react';
import { Player } from '@/types/game';
import { Standings } from '@/components/PartyUi';
import { usePreferences } from '@/components/AppShell';
export interface ReviewAnswer { question: string; correct: string; selected: string | null; points: number }
export function FinalResults({ players, myId, rounds, history, onAgain, againDisabled = false, againLabel = 'Play again, same party ↗' }: { players: Record<string, Player>; myId: string | null; rounds: number; history: ReviewAnswer[]; onAgain: () => void; againDisabled?: boolean; againLabel?: string }) {
  const sorted = Object.values(players).sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
  const winner = sorted[0];
  const me = myId ? players[myId] : null;
  const { reducedMotion } = usePreferences();
  const tied = sorted.filter(p => p.score === winner?.score);
  useEffect(() => {
    if (reducedMotion || !winner || !me || winner.score !== me.score) return;
    let cancelled = false;
    import('canvas-confetti').then(module => { if (!cancelled) module.default({ particleCount: 75, spread: 70, origin: { y: .55 }, colors: ['#e4c58d', '#b8a0f3', '#90dfce'], disableForReducedMotion: true }); });
    return () => { cancelled = true; };
  }, [reducedMotion, winner?.id, me?.id]);
  return <><div className="page-heading center"><p className="eyebrow">Good game. Great company.</p><h1 style={{ fontSize: 'clamp(32px,4vw,48px)' }}>{tied.length > 1 ? 'A shared spotlight.' : `${winner?.nickname || 'Your party'} takes the spotlight.`}</h1><p className="sub" style={{ marginInline: 'auto' }}>{rounds} questions · {sorted.length} {sorted.length === 1 ? 'player' : 'friends'} · One brilliant game</p></div>
    <div className="podium">{[sorted[1], sorted[0], sorted[2]].filter(Boolean).map(player => <div key={player.id} className={`pod ${player.score === winner.score ? 'winner' : ''}`}><span className="avatar" aria-hidden="true">{player.avatar}</span><div className="rank">{1 + sorted.filter(p => p.score > player.score).length}</div><h3>{player.nickname}{player.id === myId ? ' · you' : ''}</h3><p className="tiny">{player.score.toLocaleString()} points</p></div>)}</div>
    {me && <div className="stats"><div><b>{me.correctCount} / {rounds}</b><span>Your accuracy</span></div><div><b>{me.bestStreak}</b><span>Longest streak</span></div><div><b>{me.score.toLocaleString()}</b><span>Your score</span></div></div>}
    <div className="panel standings"><h3>Final standings</h3><Standings players={players} myId={myId} /></div><div className="actions" style={{ justifyContent: 'center' }}><button className="button primary" onClick={onAgain} disabled={againDisabled}>{againLabel}</button><a className="button quiet" href="/">Back to lounge</a></div>
    {history.length > 0 && <section className="panel standings review-list"><h3>Review your questions</h3>{history.map((answer, index) => <details key={index}><summary>{index + 1}. {answer.question} · {answer.points > 0 ? 'Correct' : 'Missed'}</summary><p>Your answer: {answer.selected || 'No answer'}</p><p>Correct answer: {answer.correct}</p><p>Points earned: {answer.points}</p></details>)}</section>}
  </>;
}
