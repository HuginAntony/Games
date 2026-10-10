import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { PublicGameRoom, ServerMessage } from '../types/game';

const host = process.env.QUIZ_TEST_HOST;
class Client {
  socket: WebSocket;
  messages: ServerMessage[] = [];
  constructor(code: string) {
    this.socket = new WebSocket(`ws://${host}/parties/game/${code}`);
    this.socket.addEventListener('message', event => this.messages.push(JSON.parse(String(event.data))));
  }
  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise<void>((resolve, reject) => { this.socket.addEventListener('open', () => resolve(), { once: true }); this.socket.addEventListener('error', reject, { once: true }); });
  }
  send(message: object) { this.socket.send(JSON.stringify(message)); }
  async wait(predicate: (message: ServerMessage) => boolean, timeout = 15000): Promise<ServerMessage> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const match = this.messages.findIndex(predicate);
      if (match >= 0) return this.messages.splice(match, 1)[0];
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error(`Timed out waiting for room message: ${JSON.stringify(this.messages.slice(-2))}`);
  }
  async state(predicate: (room: PublicGameRoom) => boolean) {
    const message = await this.wait(m => m.type === 'state-update' && predicate(m.room));
    return message as Extract<ServerMessage, { type: 'state-update' }>;
  }
  close() { this.socket.close(); }
}
const token = () => randomBytes(32).toString('hex');

test('actual durable worker: missing room, 12 simultaneous seats, privacy, resume, deadlines and same-room rematch', { skip: !host, timeout: 60000 }, async () => {
  const code = randomBytes(3).toString('hex').toUpperCase();
  const clients: Client[] = [];
  const connect = async () => { const client = new Client(code); clients.push(client); await client.open(); return client; };
  try {
    const missing = await connect();
    missing.send({ type: 'join', nickname: 'Guest', avatar: '🌟', session: token() });
    const missingError = await missing.wait(m => m.type === 'error');
    assert.match((missingError as { message: string }).message, /not found/);
    missing.close();
    const owner = await connect();
    const ownerToken = token();
    owner.send({ type: 'join', nickname: 'Alex', avatar: '⚡', create: true, session: ownerToken });
    const created = await owner.state(r => Object.keys(r.players).length === 1);
    const ownerId = created.selfId!;
    const guests: Client[] = [];
    const guestTokens: string[] = [];
    for (let i = 1; i < 12; i++) {
      const guest = await connect();
      const session = token(); guestTokens.push(session); guests.push(guest);
      guest.send({ type: 'join', nickname: 'Alex', avatar: '🌟', session });
      const joined = await guest.state(r => Object.keys(r.players).length === i + 1);
      assert.notEqual(joined.selfId, ownerId, 'same nickname must not claim host identity');
      guest.send({ type: 'ready', ready: true });
      await guest.state(r => r.players[joined.selfId!].ready);
    }
    const overflow = await connect();
    overflow.send({ type: 'join', nickname: 'Extra', avatar: '🌟', session: token() });
    assert.match((await overflow.wait(m => m.type === 'error') as { message: string }).message, /full/);
    overflow.close();
    owner.send({ type: 'settings', settings: { rounds: 5, questionSeconds: 10, revealSeconds: 5 } });
    await owner.state(r => r.settings.rounds === 5);
    for (const guest of guests) guest.send({ type: 'ready', ready: true });
    await owner.state(r => Object.values(r.players).filter(p => !p.isHost).every(p => p.ready));
    owner.send({ type: 'start' });
    owner.send({ type: 'start' });
    await owner.state(r => r.phase === 'countdown');
    await owner.wait(m => m.type === 'error');
    let state = await owner.state(r => r.phase === 'question');
    owner.send({ type: 'answer', answerIndex: -1, questionIndex: 0 });
    await owner.wait(m => m.type === 'error');
    owner.send({ type: 'answer', answerIndex: 0, questionIndex: 0 });
    await owner.wait(m => m.type === 'answer-accepted');
    const privateState = await guests[0].state(r => r.players[ownerId].answered);
    assert.equal(privateState.room.players[ownerId].answeredIndex, null);
    assert.equal(privateState.room.players[ownerId].score, 0);
    assert.equal(privateState.room.currentQuestion?.correctIndex, undefined);
    const firstGuest = await guests[0].state(r => r.phase === 'question');
    const guestId = firstGuest.selfId!;
    guests[0].close();
    await owner.state(r => !r.players[guestId].connected);
    const resumed = await connect();
    resumed.send({ type: 'join', nickname: 'Different name', avatar: '🌟', session: guestTokens[0] });
    const resumedState = await resumed.state(r => r.phase === 'question');
    assert.equal(resumedState.selfId, guestId);
    guests[0] = resumed;
    for (let round = 0; round < 5; round++) {
      if (round > 0) state = await owner.state(r => r.phase === 'question' && r.currentQuestionIndex === round);
      if (round > 0) owner.send({ type: 'answer', answerIndex: 0, questionIndex: round });
      for (const guest of guests) guest.send({ type: 'answer', answerIndex: 1, questionIndex: round });
      const reveal = await owner.state(r => r.phase === 'round-result' && r.currentQuestionIndex === round);
      assert.ok(Number.isInteger(reveal.room.currentQuestion?.correctIndex));
      assert.ok(reveal.room.phaseEndsAt - reveal.room.serverTime >= 4800, 'reveal has its full reading duration');
    }
    await owner.state(r => r.phase === 'final-result');
    owner.messages = [];
    owner.send({ type: 'rematch' });
    const rematch = await owner.state(r => r.phase === 'lobby');
    assert.equal(rematch.room.code, code);
    assert.equal(rematch.selfId, ownerId);
    assert.equal(Object.keys(rematch.room.players).length, 12);
  } finally { for (const client of clients) client.close(); }
});

test('host refresh preserves controls within grace; sustained absence promotes another seat', { skip: !host, timeout: 30000 }, async () => {
  const code = randomBytes(3).toString('hex').toUpperCase();
  const owner = new Client(code);
  const guest = new Client(code);
  const secret = token();
  let resumed: Client | undefined;
  try {
    await owner.open();
    owner.send({ type: 'join', nickname: 'Host', avatar: '⚡', create: true, session: secret });
    const state = await owner.state(r => r.phase === 'lobby');
    const originalId = state.selfId!;
    await guest.open();
    guest.send({ type: 'join', nickname: 'Guest', avatar: '🌍', session: token() });
    const joined = await guest.state(r => Object.keys(r.players).length === 2);
    owner.close();
    const absent = await guest.state(r => !r.players[originalId].connected);
    assert.equal(absent.room.hostId, originalId);
    resumed = new Client(code); await resumed.open();
    resumed.send({ type: 'join', nickname: 'Host', avatar: '⚡', create: true, session: secret });
    const refresh = await resumed.state(r => r.players[originalId].connected);
    assert.equal(refresh.room.hostId, originalId);
    assert.equal(refresh.selfId, originalId);
    guest.messages = [];
    resumed.close();
    const promoted = await guest.state(r => r.hostId === joined.selfId);
    assert.equal(promoted.room.players[joined.selfId!].isHost, true);
    guest.send({ type: 'start' });
    await guest.state(r => r.phase === 'countdown');
  } finally { owner.close(); guest.close(); resumed?.close(); }
});
