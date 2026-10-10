'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GameRoom, Question } from '@/types/game';
import { createRoom, startGame, beginRound, submitAnswer, revealRound, advanceRound } from '@/lib/game-engine';
import { getCuratedQuestions } from '@/lib/questions';
import { settingsFromQuery } from '@/lib/client-settings';
import { QuestionCard } from '@/components/QuestionCard/QuestionCard';
import { FinalResults, ReviewAnswer } from '@/components/FinalResults';
import { Timer, usePhaseClock } from '@/components/PartyUi';
import { useSound } from '@/hooks/useSound';

function Solo() {
  const query = useSearchParams();
  const settings = settingsFromQuery(query);
  const nickname = query.get('name')?.slice(0, 20) || 'Curious player';
  const avatar = query.get('avatar') || '⚡';
  const untimed = query.get('untimed') === '1';
  const [room, setRoom] = useState<GameRoom | null>(null);
  const current = useRef<GameRoom | null>(null);
  const [generation, setGeneration] = useState(0);
  const [source, setSource] = useState('Starter pack');
  const [history, setHistory] = useState<ReviewAnswer[]>([]);
  const [best, setBest] = useState(0);
  const [error, setError] = useState('');
  const reviewed = useRef(-1);
  const seconds = usePhaseClock(room?.phaseEndsAt || 0);
  const { play } = useSound();
  function update(value: GameRoom | null) { current.current = value; setRoom(value); }
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    update(null); setHistory([]); reviewed.current = -1; setError('');
    async function load() {
      let questions: Question[];
      let label = 'Starter pack · difficulty may vary';
      try {
        if (query.get('offline') === '1' || !navigator.onLine) throw new Error('Use local pack');
        const response = await fetch('/api/questions?' + new URLSearchParams({ amount: String(settings.rounds), category: settings.category, difficulty: settings.difficulty }), { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
        if (!response.ok) throw new Error('Question provider unavailable');
        questions = await response.json();
        if (!Array.isArray(questions) || questions.length < settings.rounds || questions.some(q => !q || typeof q.question !== 'string' || !Array.isArray(q.answers) || q.answers.length !== 4 || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3)) throw new Error('Invalid deck');
        label = response.headers.get('X-Quiz-Source') === 'curated' ? label : 'Open Trivia DB';
      } catch {
        if (controller.signal.aborted) return;
        questions = getCuratedQuestions(settings);
      }
      if (cancelled) return;
      const lobby = createRoom('SOLO00', 'solo', nickname, avatar);
      lobby.settings = settings;
      setSource(label);
      update(beginRound(startGame(lobby, questions, Date.now()), Date.now()));
    }
    load().catch(() => { if (!cancelled) setError('Unable to prepare this pack. Return to the lounge and try another pack.'); });
    return () => { cancelled = true; controller.abort(); };
  }, [generation, query]);
  useEffect(() => {
    if (!room) return;
    const phase = room.phase;
    if (phase === 'question') play('newQuestion');
    if (phase === 'round-result') {
      const me = room.players.solo;
      play(me.roundPoints > 0 ? 'correct' : 'wrong');
      if (reviewed.current !== room.currentQuestionIndex) {
        reviewed.current = room.currentQuestionIndex;
        const q = room.questions[room.currentQuestionIndex];
        setHistory(items => [...items, { question: q.question, correct: q.answers[q.correctIndex], selected: me.answeredIndex === null ? null : q.answers[me.answeredIndex], points: me.roundPoints }]);
      }
    }
    if (phase === 'final-result') {
      play('gameOver');
      const key = `wisquiz:best:${nickname}:${settings.rounds}:${untimed ? 'untimed' : settings.questionSeconds}:${settings.category}:${settings.difficulty}`;
      try { const record = Math.max(Number(localStorage.getItem(key) || 0), room.players.solo.score); localStorage.setItem(key, String(record)); setBest(record); } catch { setBest(room.players.solo.score); }
      return;
    }
    if (phase === 'question' && untimed) return;
    const timer = setTimeout(() => {
      const latest = current.current;
      if (!latest || latest.phase !== phase || latest.currentQuestionIndex !== room.currentQuestionIndex) return;
      if (phase === 'question') update(revealRound(latest, Date.now()));
      if (phase === 'round-result') update(advanceRound(latest, Date.now()));
    }, Math.max(0, room.phaseEndsAt - Date.now()));
    return () => clearTimeout(timer);
  }, [room?.phase, room?.currentQuestionIndex, untimed, play]);
  function answer(index: number) {
    const latest = current.current;
    if (!latest || latest.phase !== 'question' || latest.players.solo.answered) return;
    try {
      const submitted = submitAnswer(latest, 'solo', index, untimed ? latest.roundStartedAt : Date.now());
      // Untimed practice uses correctness only; handoff/reading time never adds a speed bonus.
      if (untimed) submitted.answerTimes = { ...submitted.answerTimes, solo: submitted.phaseEndsAt };
      update(revealRound(submitted, Date.now()));
    } catch { update(revealRound(latest, Date.now())); }
  }
  if (error) return <main className="content loading"><p className="notice error" role="alert">{error}</p><a href="/" className="button">Back to lounge</a></main>;
  if (!room) return <main className="content loading"><p className="eyebrow">A little time for curiosity</p><h2>Preparing your questions…</h2><p className="tiny">The starter pack is ready if the provider is unavailable.</p></main>;
  if (room.phase === 'final-result') return <main className="content"><FinalResults players={room.players} myId="solo" rounds={room.totalRounds} history={history} onAgain={() => setGeneration(value => value + 1)} againLabel="Play again →" /><p className="tiny center" style={{ marginTop: 20 }}>Personal best for these settings: {best} points · {untimed ? 'Untimed' : 'Timed'} practice</p></main>;
  const question = room.questions[room.currentQuestionIndex];
  const revealing = room.phase === 'round-result', me = room.players.solo;
  return <main className="content"><div className="page-heading"><p className="eyebrow">Solo practice · {untimed ? 'At your pace' : 'A little friendly pressure'}</p><h2>{nickname}'s table</h2><p className="sub">{source}. {untimed ? 'No timer. Correct answers earn 100 points.' : 'Choose your answer, then take a moment with the reveal.'}</p></div><div className="quiz-table"><div className="table-top"><span className="eyebrow">{question.category}</span><span className="pill">Question {room.currentQuestionIndex + 1} / {room.totalRounds}</span>{revealing ? <span className="pill">Reveal · {seconds} s</span> : untimed ? <span className="pill">Untimed</span> : <Timer seconds={seconds} duration={settings.questionSeconds} />}</div><QuestionCard {...question} correctIndex={revealing ? question.correctIndex : undefined} selectedIndex={me.answeredIndex} onAnswer={answer} disabled={revealing || (!untimed && seconds === 0)} /><p className="answer-status" role="status">{revealing ? me.roundPoints > 0 ? 'Correct. Nicely played.' : 'A good one to remember.' : 'Choose one answer, or press 1–4.'}</p></div>{revealing && <section className="reveal-summary"><div><h2>{me.roundPoints > 0 ? 'Nicely played.' : 'Keep your curiosity.'}</h2><p className="sub">Your answer: {me.answeredIndex === null ? 'No answer' : question.answers[me.answeredIndex]}</p><p className="tiny" style={{ marginTop: 10 }}>Your score: {me.score.toLocaleString()} · Next question in {seconds} seconds</p></div><div className="points">+{me.roundPoints}</div></section>}<div className="game-meta"><span>{untimed ? 'Accuracy only · 100 per correct answer' : '100 base + up to 100 speed bonus'}</span><a href="/">Back to lounge</a></div></main>;
}
export default function SoloPage() { return <Suspense fallback={<main className="loading"><h2>Preparing your table…</h2></main>}><Solo /></Suspense>; }
