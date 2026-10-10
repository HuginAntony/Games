'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { usePartySocket } from '@/hooks/usePartySocket';
import { useSound } from '@/hooks/useSound';
import { AvatarPicker, Seats, SettingsForm, Standings, Timer, usePhaseClock } from '@/components/PartyUi';
import { QuestionCard } from '@/components/QuestionCard/QuestionCard';
import { FinalResults, ReviewAnswer } from '@/components/FinalResults';
import { settingsFromQuery } from '@/lib/client-settings';

function Room() {
  const params = useParams<{ code: string }>();
  const query = useSearchParams();
  const router = useRouter();
  const code = params.code.toUpperCase();
  const [nickname, setNickname] = useState(query.get('name') || '');
  const [avatar, setAvatar] = useState(query.get('avatar') || '⚡');
  const [entered, setEntered] = useState(!!query.get('name'));
  const [localError, setLocalError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [attempt, setAttempt] = useState<number | null>(null);
  const [history, setHistory] = useState<ReviewAnswer[]>([]);
  const [showStandings, setShowStandings] = useState(false);
  const joined = useRef(false), appliedSettings = useRef(false), phaseSound = useRef('');
  const lastReviewed = useRef(-1);
  const { gameState: room, error, connected, myId, ownAnswer, pendingAnswer, send } = usePartySocket(/^[A-Z0-9]{6}$/.test(code) ? code : null);
  const me = myId ? room?.players[myId] : null;
  const seconds = usePhaseClock(room?.phaseEndsAt ?? 0, room?.serverTime);
  const { play } = useSound();

  useEffect(() => { setInviteUrl(`${window.location.origin}/lobby/${code}`); }, [code]);
  useEffect(() => {
    if (connected && entered && !joined.current) { joined.current = true; send({ type: 'join', nickname, avatar, create: query.get('host') === '1' }); }
  }, [connected, entered, nickname, avatar, send, query]);
  useEffect(() => {
    if (me?.isHost && room?.phase === 'lobby' && query.get('host') === '1' && !appliedSettings.current) {
      appliedSettings.current = true;
      const key = `wisquiz:settings-applied:${code}:${me.id}`;
      try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, 'true'); } catch { /* Still apply once in this page session. */ }
      send({ type: 'settings', settings: settingsFromQuery(query) });
    }
  }, [me?.isHost, room?.phase, send, query]);
  useEffect(() => { setAttempt(null); }, [room?.currentQuestionIndex, room?.phase === 'lobby']);
  useEffect(() => { if (error) setAttempt(null); }, [error]);
  useEffect(() => {
    if (!room || phaseSound.current === `${room.phase}:${room.currentQuestionIndex}`) return;
    phaseSound.current = `${room.phase}:${room.currentQuestionIndex}`;
    if (room.phase === 'question') play('newQuestion');
    if (room.phase === 'round-result' && me) play(me.roundPoints > 0 ? 'correct' : 'wrong');
    if (room.phase === 'final-result') play('gameOver');
  }, [room?.phase, room?.currentQuestionIndex, me, play]);
  useEffect(() => {
    if (!room || !me) return;
    const key = `wisquiz:review:${code}:${me.id}`;
    if (room.phase === 'lobby') { lastReviewed.current = -1; setHistory([]); try { sessionStorage.removeItem(key); } catch {} return; }
    if (room.phase === 'round-result' && room.currentQuestion && room.currentQuestion.correctIndex !== undefined && lastReviewed.current !== room.currentQuestionIndex) {
      lastReviewed.current = room.currentQuestionIndex;
      const question = room.currentQuestion;
      setHistory(previous => {
        let items = previous;
        if (items.length === 0) try { items = JSON.parse(sessionStorage.getItem(key) || '[]'); } catch {}
        const next = [...items.slice(0, room.currentQuestionIndex), { question: question.question, correct: question.answers[question.correctIndex!], selected: me.answeredIndex === null ? null : question.answers[me.answeredIndex], points: me.roundPoints }];
        try { sessionStorage.setItem(key, JSON.stringify(next)); } catch {}
        return next;
      });
    }
    if (room.phase === 'final-result') try { setHistory(JSON.parse(sessionStorage.getItem(key) || '[]')); } catch {}
  }, [room?.phase, room?.currentQuestionIndex, me?.id]);

  async function share() {
    try { await navigator.clipboard.writeText(inviteUrl); setShareMessage('Invite link copied.'); } catch { setShareMessage(`Share this link: ${inviteUrl}`); }
  }
  function leave() { send({ type: 'leave' }); router.push('/'); }
  const connectionNote = !connected ? <p className="notice" role="status">Connecting to your party… Your seat and accepted answer will be restored. <a href="/game/solo?offline=1">Play solo instead</a></p> : null;
  const errors = error || localError;
  if (!/^[A-Z0-9]{6}$/.test(code)) return <main className="content loading"><h2>That room code isn't valid.</h2><a href="/" className="button">Back to lounge</a></main>;
  if (!entered && !me) return <main className="content"><div className="page-heading center"><p className="eyebrow">Room {code}</p><h1>Take your seat.</h1><p className="sub" style={{ marginInline: 'auto' }}>Answer together on your own device.</p></div><form className="panel join-form stack" onSubmit={e => { e.preventDefault(); if (!nickname.trim()) { setLocalError('Enter a nickname first.'); return; } setNickname(nickname.trim()); setLocalError(''); setEntered(true); }}><label>Your nickname<input autoFocus value={nickname} maxLength={20} onChange={e => setNickname(e.target.value)} placeholder="Enter nickname…" /></label><AvatarPicker value={avatar} onChange={setAvatar} />{errors && <p role="alert" className="notice error">{errors}</p>}<button className="button primary">Join room →</button></form></main>;
  if (!room || !me) return <main className="content loading"><h2>Finding your table…</h2>{connectionNote}{errors && <p role="alert" className="notice error">{errors}</p>}<a className="button quiet" href="/">Back to lounge</a></main>;
  const ready = Object.values(room.players).filter(p => p.connected && !p.isHost).every(p => p.ready);
  if (room.phase === 'lobby') return <main className="content"><div className="page-heading"><p className="eyebrow">A table for your people</p><h1 style={{ fontSize: 'clamp(34px,4vw,50px)' }}>The party starts here.</h1><p className="sub">Everyone answers at the same time. {me.isHost ? "You're the host." : 'Make yourself at home.'}</p></div>{connectionNote}{errors && <p className="notice error" role="alert">{errors}</p>}<div className="grid-two"><section className="panel"><p className="eyebrow">Room code</p><div className="room-invite"><div><p className="room-code">{code}</p><button className="text-button" onClick={share}>Copy invite link</button></div>{inviteUrl && <div className="qr-tile" role="img" aria-label="QR code to join this party"><QRCodeSVG value={inviteUrl} size={100} fgColor="#171b21" bgColor="#fff" /></div>}</div><p role="status" className="tiny">{shareMessage || 'Share the code or scan to join.'}</p><div className="section-head" style={{ marginTop: 28 }}><h3>Your party</h3><span className="tiny">{Object.keys(room.players).length} / {room.maxPlayers} seats</span></div><ul className="roster">{Object.values(room.players).map(player => <li className="row" key={player.id}><span className="name"><span className="avatar" aria-hidden="true">{player.avatar}</span><span>{player.nickname}{player.id === myId ? ' · you' : ''}</span>{player.isHost && <span className="host-badge">HOST</span>}</span><span className="badge">{!player.connected ? 'Offline' : player.ready ? 'Ready' : 'Not ready'}</span></li>)}</ul>{!me.isHost && <button className="button wide" style={{ marginTop: 20 }} disabled={!connected || room.starting} onClick={() => send({ type: 'ready', ready: !me.ready })}>{me.ready ? 'Not ready yet' : "I'm ready"}</button>}</section><section className="panel stack"><h3>Tonight's game</h3><SettingsForm value={room.settings} onChange={settings => send({ type: 'settings', settings })} disabled={!me.isHost || !connected || room.starting} /><p className="tiny">Answers stay private until the reveal. All players use the same clock and rules.</p>{me.isHost ? <><button className="button primary wide" disabled={!connected || !ready || room.starting} onClick={() => send({ type: 'start' })}>{room.starting ? 'Preparing your questions…' : 'Start game →'}</button>{!ready && <p className="tiny" role="status">Waiting for everyone to be ready.</p>}</> : <p className="notice" role="status">{room.starting ? 'The host is preparing the questions…' : 'Waiting for the host to start.'}</p>}</section></div><div className="actions"><button className="button quiet" onClick={leave}>Leave room</button></div></main>;
  if (room.phase === 'final-result') return <main className="content">{connectionNote}{errors && <p className="notice error" role="alert">{errors}</p>}<FinalResults players={room.players} myId={myId} rounds={room.totalRounds} history={history} onAgain={() => send({ type: 'rematch' })} againDisabled={!connected || !me.isHost} />{!me.isHost && <p className="tiny center" style={{ marginTop: 20 }}>Waiting for the host to start a rematch.</p>}</main>;
  if (room.phase === 'countdown') return <main className="content loading center"><p className="eyebrow">Your party is ready</p><h2>Bring on the questions.</h2><div className="countdown-number" role="timer" aria-label={`${seconds} seconds until the question`}>{seconds || 'Go'}</div><p className="sub">Everyone answers together on their own device.</p>{connectionNote}</main>;
  const question = room.currentQuestion;
  if (!question) return <main className="content loading"><h2>Preparing the next question…</h2></main>;
  const revealing = room.phase === 'round-result';
  const selected = ownAnswer ?? attempt;
  function answer(index: number) { if (!connected || pendingAnswer || me?.answered || seconds === 0 || revealing) return; setAttempt(index); send({ type: 'answer', answerIndex: index, questionIndex: room!.currentQuestionIndex }); }
  return <main className="content">{connectionNote}{errors && <p className="notice error" role="alert">{errors}</p>}<Seats players={room.players} myId={myId} active={!revealing} /><section className="quiz-table"><div className="table-top"><span className="eyebrow">{question.category}</span><span className="pill">Question {room.currentQuestionIndex + 1} / {room.totalRounds}</span>{revealing ? <span className="pill">Shared reveal · {seconds} s</span> : <Timer seconds={seconds} duration={room.settings.questionSeconds} />}</div><QuestionCard {...question} selectedIndex={selected} disabled={!connected || revealing || pendingAnswer || me.answered || seconds === 0} onAnswer={answer} /><p className="answer-status" role="status">{revealing ? 'The answer is revealed for everyone.' : pendingAnswer ? 'Sending your answer…' : me.answered ? 'Locked in. Waiting for the shared reveal.' : seconds === 0 ? 'Time is up. Waiting for the server reveal…' : 'Choose one answer. Only you can see your choice.'}</p></section>
    {revealing && <section className="reveal-summary" aria-label="Your round result"><div><p className="eyebrow">Your result</p><h2>{me.roundPoints > 0 ? 'Nicely played.' : 'A good one to remember.'}</h2><div className="breakdown"><div>Correct answer<b>+{me.roundPoints > 0 ? 100 : 0}</b></div><div>Speed bonus<b>+{Math.max(0, me.roundPoints - 100)}</b></div><div>Your score<b>{me.score.toLocaleString()}</b></div></div></div><div className="points">+{me.roundPoints}</div></section>}
    <div className="game-meta"><span>CLASSIC · 100 base + up to 100 speed points</span><span>{room.questionSource === 'curated' ? 'Starter pack · difficulty may vary' : 'Open Trivia DB'} · {room.settings.questionSeconds} second rounds</span><button className="text-button" style={{ padding: 0 }} aria-expanded={showStandings} onClick={() => setShowStandings(!showStandings)}>Standings {showStandings ? '−' : '+'}</button></div>{showStandings && <section className="panel standings"><h3>At the table</h3><Standings players={room.players} myId={myId} /></section>}
  </main>;
}
export function OnlineRoom() { return <Suspense fallback={<main className="loading"><h2>Finding your table…</h2></main>}><Room /></Suspense>; }
