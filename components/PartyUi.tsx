'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { CATEGORY_OPTIONS, GameSettings, Player } from '@/types/game';

export const AVATARS = ['⚡', '🦊', '🐉', '🚀', '🌟', '🦁', '🦋', '🤖'];
export function AvatarPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="avatar-picker" role="group" aria-label="Choose your avatar">{AVATARS.map((avatar, i) => <button type="button" key={avatar} aria-label={['Lightning', 'Fox', 'Dragon', 'Rocket', 'Star', 'Lion', 'Butterfly', 'Robot'][i]} aria-pressed={avatar === value} onClick={() => onChange(avatar)}>{avatar}</button>)}</div>;
}
export function SettingsForm({ value, onChange, disabled = false }: { value: GameSettings; onChange: (settings: Partial<GameSettings>) => void; disabled?: boolean }) {
  return <div className="fields">
    <label>Question pack<select aria-label="Question pack" disabled={disabled} value={value.category} onChange={e => onChange({ category: e.target.value as GameSettings['category'] })}>{CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
    <label>Difficulty<select aria-label="Difficulty" disabled={disabled} value={value.difficulty} onChange={e => onChange({ difficulty: e.target.value as GameSettings['difficulty'] })}>{['mixed', 'easy', 'medium', 'hard'].map(v => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}</select></label>
    <label>Questions<select aria-label="Questions" disabled={disabled} value={value.rounds} onChange={e => onChange({ rounds: Number(e.target.value) as GameSettings['rounds'] })}>{[5, 10, 15, 20].map(v => <option key={v} value={v}>{v} questions</option>)}</select></label>
    <label>Answer time<select aria-label="Answer time" disabled={disabled} value={value.questionSeconds} onChange={e => onChange({ questionSeconds: Number(e.target.value) as GameSettings['questionSeconds'] })}>{[10, 15, 20, 30].map(v => <option key={v} value={v}>{v} seconds</option>)}</select></label>
    <label>Reveal reading time<select aria-label="Reveal reading time" disabled={disabled} value={value.revealSeconds} onChange={e => onChange({ revealSeconds: Number(e.target.value) as GameSettings['revealSeconds'] })}>{[4, 5, 8, 12].map(v => <option key={v} value={v}>{v} seconds</option>)}</select></label>
    <div><label>Rules</label><p className="tiny" style={{ marginTop: 10 }}>Classic · 100 for a correct answer, plus up to 100 speed points.</p></div>
  </div>;
}
export function usePhaseClock(deadline: number, serverTime?: number) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const skew = serverTime ? serverTime - Date.now() : 0;
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now() - skew) / 1000)));
    tick(); const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [deadline, serverTime]);
  return left;
}
export function Timer({ seconds, duration }: { seconds: number; duration: number }) {
  return <div className={`timer ${seconds <= 5 ? 'urgent' : ''}`} role="timer" aria-label={`${seconds} seconds left`} style={{ '--timer-progress': `${Math.min(100, seconds / duration * 100)}%` } as CSSProperties}><span>{seconds} s</span></div>;
}
export function Seats({ players, myId, active }: { players: Record<string, Player>; myId: string | null; active: boolean }) {
  const list = Object.values(players);
  return <div className="seat-strip" aria-label="Player seats">{list.map(player => <div className={`seat ${player.id === myId ? 'me' : ''}`} key={player.id}><span className="avatar" aria-hidden="true">{player.avatar}</span><div className="identity"><b>{player.nickname}{player.id === myId ? ' · you' : ''}</b><small>{!player.connected ? 'Reconnecting' : active ? player.answered ? 'Locked in' : 'Thinking' : player.isHost ? 'Host' : 'At the table'}</small></div><span className="score">{player.score.toLocaleString()}</span></div>)}<div className="seat-summary"><b>{active ? `${list.filter(p => p.answered).length} / ${list.length} locked in` : `${list.length} at the table`}</b><small>Full roster in standings</small></div></div>;
}
export function Standings({ players, myId }: { players: Record<string, Player>; myId: string | null }) {
  const sorted = Object.values(players).sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
  return <ol className="roster" aria-label="Standings">{sorted.map((player, i) => <li className="row" key={player.id}><span className="name"><span className="tiny">{1 + sorted.filter(p => p.score > player.score).length}.</span><span className="avatar" aria-hidden="true">{player.avatar}</span><span>{player.nickname}{player.id === myId ? ' · you' : ''}</span></span><b>{player.score.toLocaleString()} <small>pts</small></b></li>)}</ol>;
}
