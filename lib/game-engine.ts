import { GameRoom, Player, Question, PublicGameRoom, GameSettings, DEFAULT_SETTINGS, MAX_PLAYERS, CATEGORY_OPTIONS } from '../types/game';
import { calculateScore } from './scoring';

function newPlayer(id: string, nickname: string, avatar: string, isHost = false): Player {
  const name = nickname.trim().slice(0, 20);
  if (!name) throw new Error('Choose a nickname.');
  return { id, nickname: name, avatar: avatar.slice(0, 16), isHost, score: 0, answeredIndex: null, answered: false, connected: true, ready: isHost, roundPoints: 0, correctCount: 0, streak: 0, bestStreak: 0 };
}
export function createRoom(code: string, hostId: string, hostname: string, avatar = '⚡'): GameRoom {
  return { code, phase: 'lobby', hostId, players: { [hostId]: newPlayer(hostId, hostname, avatar, true) }, questions: [], currentQuestionIndex: 0, roundStartedAt: 0, phaseEndsAt: 0, maxPlayers: MAX_PLAYERS, totalRounds: DEFAULT_SETTINGS.rounds, settings: { ...DEFAULT_SETTINGS }, questionSource: null, starting: false, answerTimes: {} };
}
export function joinRoom(room: GameRoom, playerId: string, nickname: string, avatar = '⚡'): GameRoom {
  if (room.players[playerId]) return setConnected(room, playerId, true);
  if (room.phase !== 'lobby' || room.starting) throw new Error('This party has started. Reconnect using your original browser.');
  if (Object.keys(room.players).length >= room.maxPlayers) throw new Error('This party is full.');
  return { ...room, players: { ...room.players, [playerId]: newPlayer(playerId, nickname, avatar) } };
}
export function setConnected(room: GameRoom, id: string, connected: boolean, promoteHost = true): GameRoom {
  if (!room.players[id]) return room;
  const players = { ...room.players, [id]: { ...room.players[id], connected } };
  let hostId = room.hostId;
  if (promoteHost && !players[hostId]?.connected) hostId = Object.values(players).find(p => p.connected)?.id ?? hostId;
  for (const key of Object.keys(players)) players[key] = { ...players[key], isHost: key === hostId };
  return { ...room, players, hostId };
}
export function removePlayer(room: GameRoom, id: string): GameRoom {
  const players = { ...room.players };
  delete players[id];
  const hostId = players[room.hostId] ? room.hostId : Object.values(players).find(p => p.connected)?.id ?? Object.keys(players)[0] ?? '';
  for (const key of Object.keys(players)) players[key] = { ...players[key], isHost: key === hostId };
  return { ...room, players, hostId };
}
export function validateSettings(input: unknown, previous = DEFAULT_SETTINGS): GameSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid party settings.');
  const value = { ...previous, ...input } as GameSettings;
  if (![5, 10, 15, 20].includes(value.rounds) || !CATEGORY_OPTIONS.some(c => c.value === value.category) || !['mixed', 'easy', 'medium', 'hard'].includes(value.difficulty) || ![10, 15, 20, 30].includes(value.questionSeconds) || ![4, 5, 8, 12].includes(value.revealSeconds)) throw new Error('Invalid party settings.');
  return { rounds: value.rounds, category: value.category, difficulty: value.difficulty, questionSeconds: value.questionSeconds, revealSeconds: value.revealSeconds };
}
export function startGame(room: GameRoom, questions: Question[], now = Date.now()): GameRoom {
  if (room.phase !== 'lobby') throw new Error('Party already started.');
  if (questions.length < room.settings.rounds) throw new Error('Not enough questions for this party.');
  const players = Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, { ...p, score: 0, answered: false, answeredIndex: null, roundPoints: 0, correctCount: 0, streak: 0, bestStreak: 0 }]));
  return { ...room, phase: 'countdown', phaseEndsAt: now + 3000, starting: false, questions: questions.slice(0, room.settings.rounds), totalRounds: room.settings.rounds, currentQuestionIndex: 0, players, answerTimes: {} };
}
export function beginRound(room: GameRoom, now = Date.now()): GameRoom {
  if (room.phase !== 'countdown') return room;
  return { ...room, phase: 'question', roundStartedAt: now, phaseEndsAt: now + room.settings.questionSeconds * 1000, answerTimes: {}, players: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, { ...p, answeredIndex: null, answered: false, roundPoints: 0 }])) };
}
export function submitAnswer(room: GameRoom, id: string, index: number, now = Date.now()): GameRoom {
  const player = room.players[id];
  const question = room.questions[room.currentQuestionIndex];
  if (room.phase !== 'question' || now >= room.phaseEndsAt) throw new Error('The answer window has closed.');
  if (!player) throw new Error('Join the party first.');
  if (!Number.isInteger(index) || index < 0 || index >= question.answers.length) throw new Error('Choose a valid answer.');
  if (player.answered) return room;
  return { ...room, players: { ...room.players, [id]: { ...player, answered: true, answeredIndex: index } }, answerTimes: { ...room.answerTimes, [id]: now } };
}
export function revealRound(room: GameRoom, now = Date.now()): GameRoom {
  if (room.phase !== 'question') return room;
  const question = room.questions[room.currentQuestionIndex];
  const players = Object.fromEntries(Object.entries(room.players).map(([id, p]) => {
    const correct = p.answeredIndex === question.correctIndex;
    const points = correct ? calculateScore((room.phaseEndsAt - room.answerTimes[id]) / 1000, room.settings.questionSeconds) : 0;
    const streak = correct ? p.streak + 1 : 0;
    return [id, { ...p, score: p.score + points, roundPoints: points, correctCount: p.correctCount + Number(correct), streak, bestStreak: Math.max(p.bestStreak, streak) }];
  }));
  return { ...room, players, phase: 'round-result', phaseEndsAt: now + room.settings.revealSeconds * 1000 };
}
export function advanceRound(room: GameRoom, now = Date.now()): GameRoom {
  if (room.phase !== 'round-result') return room;
  if (room.currentQuestionIndex + 1 >= room.totalRounds) return { ...room, phase: 'final-result', phaseEndsAt: 0 };
  return beginRound({ ...room, phase: 'countdown', currentQuestionIndex: room.currentQuestionIndex + 1 }, now);
}
export function rematchRoom(room: GameRoom): GameRoom {
  if (room.phase !== 'final-result') throw new Error('Finish this party first.');
  const players = Object.fromEntries(Object.entries(room.players).filter(([, p]) => p.connected).map(([id, p]) => [id, { ...p, answered: false, answeredIndex: null, ready: p.isHost, roundPoints: 0 }]));
  return { ...room, phase: 'lobby', phaseEndsAt: 0, questions: [], questionSource: null, starting: false, currentQuestionIndex: 0, players, answerTimes: {} };
}
export function toPublicRoom(room: GameRoom, now = Date.now()): PublicGameRoom {
  const { questions, answerTimes: _privateTimes, ...publicRoom } = room;
  const revealed = room.phase === 'round-result' || room.phase === 'final-result';
  const q = questions[room.currentQuestionIndex];
  const currentQuestion = q && room.phase !== 'lobby' && room.phase !== 'countdown' ? { category: q.category, question: q.question, answers: q.answers, difficulty: q.difficulty, ...(revealed ? { correctIndex: q.correctIndex } : {}) } : null;
  const players = Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, { ...p, answeredIndex: revealed ? p.answeredIndex : null }]));
  return { ...publicRoom, players, currentQuestion, serverTime: now };
}
export function allAnswered(room: GameRoom): boolean {
  const players = Object.values(room.players).filter(p => p.connected);
  return players.length > 0 && players.every(p => p.answered);
}
