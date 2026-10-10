import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import type { ServerMessage } from '../types/game';
const enabled = process.env.QUIZ_TEST_RESTART === '1';
async function startWorker() {
  const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--env', 'test', '--port', '2001', '--ip', '127.0.0.1', '--persist-to', '.validation-worker/restart-state'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, XDG_CONFIG_HOME: resolve('.validation-worker/config'), WRANGLER_LOG_PATH: resolve('.validation-worker/logs'), WRANGLER_SEND_METRICS: 'false' } });
  await new Promise<void>((accept, reject) => {
    let log = '';
    const timeout = setTimeout(() => reject(new Error(log)), 20000);
    child.stdout.on('data', b => { log += String(b); if (log.includes('Ready on')) { clearTimeout(timeout); accept(); } });
    child.stderr.on('data', b => log += String(b));
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Worker exited ${code}: ${log}`)); });
  });
  return child;
}
async function stopWorker(child: ReturnType<typeof spawn>) {
  if (!child.pid) return;
  if (process.platform === 'win32') await new Promise<void>(accept => execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => accept()));
  else child.kill('SIGTERM');
}
class Seat {
  socket: WebSocket;
  messages: ServerMessage[] = [];
  constructor(code: string) { this.socket = new WebSocket(`ws://127.0.0.1:2001/parties/game/${code}`); this.socket.addEventListener('message', e => this.messages.push(JSON.parse(String(e.data)))); }
  async open() { await new Promise<void>((accept, reject) => { this.socket.addEventListener('open', () => accept(), { once: true }); this.socket.addEventListener('error', reject, { once: true }); }); }
  send(value: object) { this.socket.send(JSON.stringify(value)); }
  async wait(predicate: (m: ServerMessage) => boolean, duration = 15000) {
    const start = Date.now();
    while (Date.now() - start < duration) {
      const index = this.messages.findIndex(predicate);
      if (index >= 0) return this.messages.splice(index, 1)[0];
      await new Promise(accept => setTimeout(accept, 20));
    }
    throw new Error(`No expected message: ${JSON.stringify(this.messages.slice(-2))}`);
  }
}
test('SQLite room, own accepted answer, player ID and alarm survive Worker restart', { skip: !enabled, timeout: 60000 }, async () => {
  let worker = await startWorker();
  const code = randomBytes(3).toString('hex').toUpperCase();
  const session = randomBytes(32).toString('hex');
  const seats: Seat[] = [];
  const connect = async () => { const s = new Seat(code); seats.push(s); await s.open(); return s; };
  try {
    const host = await connect();
    host.send({ type: 'join', nickname: 'Host', avatar: '⚡', create: true, session });
    const joined = await host.wait(m => m.type === 'state-update') as Extract<ServerMessage, { type: 'state-update' }>;
    host.send({ type: 'settings', settings: { rounds: 5, questionSeconds: 20, revealSeconds: 5 } });
    await host.wait(m => m.type === 'state-update' && m.room.settings.questionSeconds === 20);
    const guest = await connect();
    const guestSession = randomBytes(32).toString('hex');
    guest.send({ type: 'join', nickname: 'Guest', avatar: '🌍', session: guestSession });
    await guest.wait(m => m.type === 'state-update');
    guest.send({ type: 'ready', ready: true });
    await host.wait(m => m.type === 'state-update' && Object.values(m.room.players).filter(p => !p.isHost).every(p => p.ready));
    host.send({ type: 'start' });
    const active = await host.wait(m => m.type === 'state-update' && m.room.phase === 'question') as Extract<ServerMessage, { type: 'state-update' }>;
    host.send({ type: 'answer', answerIndex: 0, questionIndex: 0 });
    await host.wait(m => m.type === 'answer-accepted');
    await stopWorker(worker);
    worker = await startWorker();
    const resumed = await connect();
    resumed.send({ type: 'join', nickname: 'New label', avatar: '🌟', session });
    const state = await resumed.wait(m => m.type === 'state-update') as Extract<ServerMessage, { type: 'state-update' }>;
    assert.equal(state.selfId, joined.selfId);
    assert.equal(state.ownAnswer, 0);
    assert.equal(state.room.phase, 'question');
    assert.equal(state.room.phaseEndsAt, active.room.phaseEndsAt);
    assert.equal(state.room.players[joined.selfId!].score, 0);
    const remaining = await connect();
    remaining.send({ type: 'join', nickname: 'Guest', avatar: '🌍', session: guestSession });
    await remaining.wait(m => m.type === 'state-update');
    const reveal = await resumed.wait(m => m.type === 'state-update' && m.room.phase === 'round-result', 25000) as Extract<ServerMessage, { type: 'state-update' }>;
    assert.ok(reveal.room.serverTime >= active.room.phaseEndsAt);
    assert.ok(Number.isInteger(reveal.room.currentQuestion?.correctIndex));
  } finally { for (const seat of seats) seat.socket.close(); await stopWorker(worker); }
});
