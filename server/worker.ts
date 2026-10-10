/// <reference types="@cloudflare/workers-types" />
import { routePartykitRequest, Server, type Connection, type ConnectionContext } from 'partyserver';
import { ClientMessage, GameRoom, ServerMessage } from '../types/game';
import { createRoom, joinRoom, setConnected, removePlayer, startGame, beginRound, submitAnswer, revealRound, advanceRound, allAnswered, toPublicRoom, validateSettings, rematchRoom } from '../lib/game-engine';
import { loadQuestionDeck } from '../lib/opentdb';

interface Env { Game: DurableObjectNamespace; QUIZ_QUESTION_SOURCE?: string }
interface Seat { playerId?: string; credential: string; lastMessageAt?: number; burst?: number }
interface SavedRoom { room: GameRoom | null; credentials: Record<string, string>; expiresAt: number; hostPromotionAt?: number }
const ROOM_TTL = 6 * 60 * 60 * 1000;

export class Game extends Server<Env> {
  static options = { hibernate: true };
  private room: GameRoom | null = null;
  private credentials: Record<string, string> = {};
  private expiresAt = 0;
  private hostPromotionAt = 0;
  private operations: Promise<void> = Promise.resolve();

  private serial(action: () => Promise<void>): Promise<void> {
    const work = this.operations.then(action);
    this.operations = work.catch(() => {});
    return work;
  }
  async onStart() {
    const saved = await this.ctx.storage.get<SavedRoom>('quiz');
    if (saved) { this.room = saved.room; this.credentials = saved.credentials; this.expiresAt = saved.expiresAt; this.hostPromotionAt = saved.hostPromotionAt ?? 0; }
    if (this.room) {
      const connected = new Set(Array.from(this.getConnections<Seat>()).map(c => c.state?.playerId));
      for (const id of Object.keys(this.room.players)) this.room = setConnected(this.room, id, connected.has(id), false);
      if (!this.room.players[this.room.hostId]?.connected && !this.hostPromotionAt) this.hostPromotionAt = Date.now() + 10000;
    }
    if (this.room?.starting) { this.room = { ...this.room, starting: false }; await this.persist(); }
  }
  async onConnect(connection: Connection<Seat>, _context: ConnectionContext) {
    await this.serial(async () => {
      connection.setState({ credential: '' });
      await this.catchUp();
    });
  }
  async onMessage(connection: Connection<Seat>, message: string | ArrayBuffer) {
    await this.serial(async () => {
      try {
        if (typeof message !== 'string' || message.length > 2048) throw new Error('Invalid party message.');
        const seat = connection.state;
        if (!seat) throw new Error('Reconnect to the party.');
        const now = Date.now();
        const burst = now - (seat.lastMessageAt ?? 0) < 1000 ? (seat.burst ?? 0) + 1 : 1;
        connection.setState({ ...seat, lastMessageAt: burst === 1 ? now : seat.lastMessageAt, burst });
        if (burst > 20) throw new Error('Too many messages. Please wait a moment.');
        const raw: unknown = JSON.parse(message);
        if (!raw || typeof raw !== 'object' || !('type' in raw)) throw new Error('Invalid party message.');
        const msg = raw as ClientMessage;
        await this.catchUp();
        if (msg.type === 'join') {
          if (typeof msg.nickname !== 'string' || typeof msg.avatar !== 'string' || msg.nickname.length > 80 || msg.avatar.length > 32) throw new Error('Invalid player profile.');
          if (typeof msg.session !== 'string' || !/^[a-f0-9]{64}$/.test(msg.session)) throw new Error('Invalid player session.');
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg.session));
          const credential = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
          let id = Object.keys(this.credentials).find(key => this.credentials[key] === credential);
          if (!id || !this.room?.players[id]) {
            if (!this.room && msg.create !== true) throw new Error('Party not found. Check the code or ask your host to create it again.');
            if (this.room && msg.create === true) throw new Error('This party code is already in use. Create a new party.');
            id = crypto.randomUUID();
            this.room = this.room ? joinRoom(this.room, id, msg.nickname, msg.avatar) : createRoom(this.name, id, msg.nickname, msg.avatar);
            this.credentials[id] = credential;
          } else this.room = setConnected(this.room, id, true, this.hostPromotionAt === 0);
          this.room = setConnected(this.room, id, true, this.hostPromotionAt === 0);
          if (id === this.room.hostId) this.hostPromotionAt = 0;
          connection.setState({ ...connection.state!, credential, playerId: id });
        } else {
          const id = seat.playerId;
          if (!id || !this.room?.players[id]) throw new Error('Join the party first.');
          switch (msg.type) {
            case 'settings':
              this.requireHost(id);
              if (this.room.phase !== 'lobby' || this.room.starting) throw new Error('Settings are locked during play.');
              this.room = { ...this.room, settings: validateSettings(msg.settings, this.room.settings) };
              this.room.totalRounds = this.room.settings.rounds;
              this.room.players = Object.fromEntries(Object.entries(this.room.players).map(([key, p]) => [key, { ...p, ready: p.isHost }]));
              break;
            case 'ready':
              if (this.room.phase !== 'lobby' || typeof msg.ready !== 'boolean') throw new Error('Invalid ready state.');
              this.room.players = { ...this.room.players, [id]: { ...this.room.players[id], ready: msg.ready } };
              break;
            case 'start': {
              this.requireHost(id);
              if (this.room.phase !== 'lobby' || this.room.starting) throw new Error('Party is already starting.');
              if (msg.rounds !== undefined) this.room.settings = validateSettings({ rounds: msg.rounds }, this.room.settings);
              if (Object.values(this.room.players).some(p => p.connected && !p.isHost && !p.ready)) throw new Error('Wait for everyone to be ready.');
              this.room = { ...this.room, starting: true };
              await this.persist(); this.publish();
              const deck = await loadQuestionDeck(this.room.settings, this.env.QUIZ_QUESTION_SOURCE === 'curated');
              this.room = { ...startGame(this.room, deck.questions), questionSource: deck.source };
              break;
            }
            case 'answer':
              if (msg.questionIndex !== this.room.currentQuestionIndex) throw new Error('That question has ended.');
              this.room = submitAnswer(this.room, id, msg.answerIndex);
              await this.persist();
              this.send(connection, { type: 'answer-accepted', answerIndex: this.room.players[id].answeredIndex!, questionIndex: this.room.currentQuestionIndex });
              if (allAnswered(this.room)) this.room = revealRound(this.room);
              break;
            case 'rematch': this.requireHost(id); this.room = rematchRoom(this.room); break;
            case 'leave':
              this.room = removePlayer(this.room, id);
              delete this.credentials[id];
              connection.setState({ ...connection.state!, playerId: undefined });
              if (Object.keys(this.room.players).length === 0) this.room = null;
              connection.close(1000, 'Left party');
              break;
            default: throw new Error('Unknown party command.');
          }
        }
        await this.persist(); this.publish();
      } catch (error) {
        if (this.room?.starting) { this.room = { ...this.room, starting: false }; await this.persist(); this.publish(); }
        this.send(connection, { type: 'error', message: error instanceof Error ? error.message : 'Unable to update this party.' });
      }
    });
  }
  async onClose(connection: Connection<Seat>) {
    await this.serial(async () => {
      const id = connection.state?.playerId;
      if (!id || !this.room?.players[id]) return;
      const another = Array.from(this.getConnections<Seat>()).some(c => c.id !== connection.id && c.state?.playerId === id);
      if (!another) {
        this.room = setConnected(this.room, id, false, false);
        if (id === this.room.hostId) this.hostPromotionAt = Date.now() + 10000;
        await this.persist(); this.publish();
      }
    });
  }
  async onAlarm() {
    await this.serial(async () => {
      if (this.expiresAt && Date.now() >= this.expiresAt) {
        this.room = null; this.credentials = {}; this.expiresAt = 0; this.hostPromotionAt = 0;
        for (const c of this.getConnections()) c.close(1000, 'Party expired');
        await this.ctx.storage.delete('quiz');
        return;
      }
      await this.catchUp();
      await this.scheduleAlarm();
    });
  }
  private requireHost(id: string) { if (this.room?.hostId !== id || !this.room.players[id]?.connected) throw new Error('Only the connected host can do that.'); }
  private async catchUp() {
    if (this.room && this.hostPromotionAt && Date.now() >= this.hostPromotionAt) {
      this.room = setConnected(this.room, this.room.hostId, this.room.players[this.room.hostId]?.connected ?? false);
      this.hostPromotionAt = 0;
      await this.persist(); this.publish();
    }
    if (!this.room || !this.room.phaseEndsAt || Date.now() < this.room.phaseEndsAt) return;
    const now = Date.now();
    switch (this.room.phase) {
      case 'countdown': this.room = beginRound(this.room, now); break;
      case 'question': this.room = revealRound(this.room, now); break;
      case 'round-result': this.room = advanceRound(this.room, now); break;
    }
    await this.persist(); this.publish();
  }
  private async persist() {
    this.expiresAt = Date.now() + ROOM_TTL;
    this.credentials = Object.fromEntries(Object.entries(this.credentials).filter(([id]) => this.room?.players[id]));
    await this.ctx.storage.put('quiz', { room: this.room, credentials: this.credentials, expiresAt: this.expiresAt, hostPromotionAt: this.hostPromotionAt } satisfies SavedRoom);
    await this.scheduleAlarm();
  }
  private async scheduleAlarm() {
    const deadlines = [this.room?.phaseEndsAt, this.hostPromotionAt, this.expiresAt].filter((value): value is number => Boolean(value));
    await this.ctx.storage.setAlarm(deadlines.length ? Math.min(...deadlines) : Date.now() + ROOM_TTL);
  }
  private send(connection: Connection, message: ServerMessage) { connection.send(JSON.stringify(message)); }
  private sendState(connection: Connection<Seat>) {
    if (!this.room) return;
    const id = connection.state?.playerId;
    if (!id) return;
    this.send(connection, { type: 'state-update', room: toPublicRoom(this.room), selfId: id, ownAnswer: id ? this.room.players[id]?.answeredIndex ?? null : null });
  }
  private publish() { for (const connection of this.getConnections<Seat>()) this.sendState(connection); }
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') return Response.json({ status: 'ok', transport: 'partyserver' });
    const roomPath = /^\/parties\/game\/([A-Z0-9]{6})$/.test(url.pathname);
    if (!roomPath) return new Response('Not found', { status: 404 });
    return await routePartykitRequest(request, env) ?? new Response('Not found', { status: 404 });
  },
};
