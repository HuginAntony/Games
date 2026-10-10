import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, joinRoom, setConnected, startGame, beginRound, submitAnswer, revealRound, advanceRound, toPublicRoom, validateSettings, rematchRoom, allAnswered } from '../lib/game-engine';
import { DEFAULT_SETTINGS, CATEGORY_OPTIONS, GameRoom } from '../types/game';
import { getCuratedQuestions } from '../lib/questions';
import { loadQuestionDeck, decodeEntities } from '../lib/opentdb';
import { calculateScore } from '../lib/scoring';

function activeRoom(): GameRoom {
  const lobby = createRoom('ABC123', 'host', 'Alex');
  lobby.settings = { ...DEFAULT_SETTINGS, rounds: 5 };
  return beginRound(startGame(lobby, getCuratedQuestions(lobby.settings), 1000), 4000);
}
test('simultaneous answers remain private and scores only change at reveal', () => {
  let room = activeRoom();
  room.players.guest = { ...room.players.host, id: 'guest', nickname: 'Sam', isHost: false };
  const correct = room.questions[0].correctIndex;
  room = submitAnswer(room, 'host', correct, 5000);
  const publicRoom = toPublicRoom(room, 5000);
  assert.equal(publicRoom.players.host.answered, true);
  assert.equal(publicRoom.players.host.answeredIndex, null);
  assert.equal(publicRoom.players.host.score, 0);
  assert.equal(publicRoom.players.host.correctCount, 0);
  assert.equal(publicRoom.currentQuestion?.correctIndex, undefined);
  assert.equal('answerTimes' in publicRoom, false);
  assert.equal('questions' in publicRoom, false);
  assert.equal(allAnswered(room), false);
  room = submitAnswer(room, 'guest', (correct + 1) % 4, 6000);
  assert.equal(allAnswered(room), true);
  const revealed = revealRound(room, 6000);
  assert.equal(revealed.players.host.score, 200);
  assert.equal(revealed.players.guest.score, 0);
  assert.equal(toPublicRoom(revealed).currentQuestion?.correctIndex, correct);
  assert.equal(revealRound(revealed, 7000), revealed, 'reveals must not score twice');
});
test('deadline, malformed index and duplicate answer guards', () => {
  const room = activeRoom();
  assert.throws(() => submitAnswer(room, 'host', 0, room.phaseEndsAt), /closed/);
  for (const index of [-1, 4, 1.5, NaN]) assert.throws(() => submitAnswer(room, 'host', index, 5000), /valid answer/);
  const answered = submitAnswer(room, 'host', 1, 5000);
  assert.equal(submitAnswer(answered, 'host', 2, 6000), answered);
});
test('twelve unique seats and stable resume prevent nickname-based seat takeover', () => {
  let room = createRoom('ABC123', 'host', 'Alex');
  for (let i = 1; i < 12; i++) room = joinRoom(room, `guest${i}`, 'Alex');
  assert.equal(Object.keys(room.players).length, 12);
  assert.equal(joinRoom(room, 'guest1', 'Changed').players.guest1.nickname, 'Alex');
  assert.throws(() => joinRoom(room, 'thirteenth', 'Alex'), /full/);
  const active = beginRound(startGame(room, getCuratedQuestions(room.settings), 1000), 4000);
  assert.throws(() => joinRoom(active, 'stranger', 'Alex'), /started/);
});
test('disconnect promotes a connected host and preserves the absent seat score', () => {
  let room = joinRoom(createRoom('ABC123', 'host', 'Alex'), 'guest', 'Sam');
  room.players.host.score = 234;
  room = setConnected(room, 'host', false);
  assert.equal(room.hostId, 'guest');
  assert.equal(room.players.host.score, 234);
  room = setConnected(room, 'host', true);
  assert.equal(room.hostId, 'guest');
  assert.equal(room.players.host.id, 'host');
});
test('round durations and reveal reading time survive serialization', () => {
  let room = activeRoom();
  room = JSON.parse(JSON.stringify(room));
  assert.equal(room.phaseEndsAt, 19000);
  room = revealRound(room, 19000);
  assert.equal(room.phaseEndsAt, 23000);
  room = advanceRound(room, 23000);
  assert.equal(room.currentQuestionIndex, 1);
  assert.equal(room.phaseEndsAt, 38000);
});
test('round totals and rematch are controlled by the deck settings', () => {
  let room = activeRoom();
  assert.equal(room.totalRounds, 5);
  for (let i = 0; i < 5; i++) room = advanceRound(revealRound(room, 20000 + i * 25000), 28000 + i * 25000);
  assert.equal(room.phase, 'final-result');
  const lobby = rematchRoom(room);
  assert.equal(lobby.code, 'ABC123');
  assert.equal(lobby.players.host.id, 'host');
  assert.equal(lobby.phase, 'lobby');
  assert.equal(lobby.questions.length, 0);
});
test('speed scoring stays within 100–200 and caps the ten-second bonus', () => {
  for (const duration of [10, 15, 20, 30]) {
    assert.equal(calculateScore(duration, duration), 200);
    assert.equal(calculateScore(0, duration), 100);
    assert.equal(calculateScore(duration / 2, duration), 100 + Math.min(100, Math.floor(duration / 2) * 10));
  }
});
test('runtime settings validation rejects invalid options', () => {
  for (const value of [{ rounds: 50 }, { rounds: NaN }, { category: 'unknown' }, { difficulty: 'impossible' }, { questionSeconds: 1 }, { revealSeconds: 0 }, null, []]) assert.throws(() => validateSettings(value), /Invalid/);
  assert.equal(validateSettings({ rounds: 20 }).rounds, 20);
  assert.equal(validateSettings({}).revealSeconds, 4);
  assert.equal(validateSettings({ revealSeconds: 4 }).revealSeconds, 4);
});
test('curated decks contain complete unique multiple-choice category rounds', () => {
  for (const category of CATEGORY_OPTIONS) {
    const questions = getCuratedQuestions({ ...DEFAULT_SETTINGS, rounds: 20, category: category.value });
    assert.equal(questions.length, 20);
    assert.equal(new Set(questions.map(q => q.question)).size, 20);
    for (const q of questions) {
      assert.equal(q.answers.length, 4);
      assert.equal(new Set(q.answers).size, 4);
      assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
      if (category.value !== 'mixed') assert.equal(q.category.toLowerCase(), category.value);
    }
  }
});
test('provider outage uses bundled questions without network retries', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('offline'); };
  try {
    const deck = await loadQuestionDeck(DEFAULT_SETTINGS);
    assert.equal(deck.source, 'curated');
    assert.equal(deck.questions.length, 10);
    assert.equal(calls, 1);
    await loadQuestionDeck(DEFAULT_SETTINGS, true);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});
test('provider entities decode numeric and common named characters', () => {
  assert.equal(decodeEntities('Caf&eacute; &amp; &#x1F30D; &#039;'), "Café & 🌍 '");
});
