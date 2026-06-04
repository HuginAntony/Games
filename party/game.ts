import type * as Party from 'partykit/server';
import {
  GameRoom,
  ClientMessage,
  ServerMessage,
  PublicGameRoom,
  ROUND_DURATION_MS,
  TOTAL_ROUNDS,
} from '../types/game';
import {
  createRoom,
  joinRoom,
  rejoinGame,
  removePlayer,
  startGame,
  beginRound,
  submitAnswer,
  revealRound,
  advanceRound,
  allAnswered,
  toPublicRoom,
} from '../lib/game-engine';
import { fetchQuestionsFromOtdb as fetchQuestions } from '../lib/opentdb';

export default class QuizRoom implements Party.Server {
  private room: GameRoom | null = null;
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  /** Tracks the 3-second "show results" timer so it can be cleared if needed */
  private resultTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly party: Party.Party) {}

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Send current state immediately to the new connection
    if (this.room) {
      this.sendTo(conn, { type: 'state-update', room: toPublicRoom(this.room) });
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case 'join':
        this.handleJoin(sender, msg.nickname, msg.avatar);
        break;
      case 'start':
        await this.handleStart(sender.id, msg.rounds);
        break;
      case 'answer':
        this.handleAnswer(sender.id, msg.answerIndex);
        break;
    }
  }

  async onClose(conn: Party.Connection) {
    if (!this.room) return;

    // During an active game, players are navigating between pages (lobby → game).
    // Their lobby socket closes before the game page socket opens.
    // Don't evict them mid-game — rejoinGame() will update their socket ID when they reconnect.
    // Only remove them in the lobby phase, where leaving actually makes sense.
    if (this.room.phase !== 'lobby') return;

    this.room = removePlayer(this.room, conn.id);

    if (Object.keys(this.room.players).length === 0) {
      // All players left the lobby — reset room to null so the next joiner
      // starts a fresh room and becomes host (handles React Strict Mode remount too)
      this.room = null;
      this.clearRoundTimer();
      return;
    }
    this.broadcast({ type: 'state-update', room: toPublicRoom(this.room) });
  }

  // ─── Message handlers ──────────────────────────────────────────────────────

  private handleJoin(conn: Party.Connection, nickname: string, avatar = '⚡') {
    try {
      const trimmed = nickname.trim().slice(0, 20) || 'Player';

      if (!this.room) {
        // First joiner (or room was reset after all left) — creates room and becomes host
        this.room = createRoom(this.party.id, conn.id, trimmed, avatar);
      } else if (this.room.phase === 'lobby') {
        if (this.room.players[conn.id]) {
          // Same socket sent join twice (React Strict Mode / network glitch) — idempotent
        } else if (Object.values(this.room.players).some((p) => p.nickname === trimmed)) {
          // Same player reconnected with a new socket ID — swap ID, preserve host status
          this.room = rejoinGame(this.room, conn.id, nickname);
        } else {
          // Brand-new player joining the lobby
          this.room = joinRoom(this.room, conn.id, nickname, avatar);
        }
      } else {
        // Game in progress — player navigating lobby → game page; update socket ID
        this.room = rejoinGame(this.room, conn.id, nickname);
      }

      this.broadcast({ type: 'state-update', room: toPublicRoom(this.room) });
    } catch (err: unknown) {
      this.sendTo(conn, { type: 'error', message: (err as Error).message });
    }
  }

  private async handleStart(senderId: string, rounds?: number) {
    if (!this.room) return;
    if (this.room.hostId !== senderId) return; // only host can start
    if (this.room.phase !== 'lobby') return;

    try {
      const questions = await fetchQuestions(rounds ?? TOTAL_ROUNDS);
      this.room = startGame(this.room, questions);
      this.broadcast({ type: 'state-update', room: toPublicRoom(this.room) });

      // Short countdown before first question
      await this.delay(3000);
      this.startRound();
    } catch (err: unknown) {
      this.broadcast({ type: 'error', message: 'Failed to load questions. Try again.' });
      console.error(err);
    }
  }

  private handleAnswer(senderId: string, answerIndex: number) {
    if (!this.room || this.room.phase !== 'question') return;
    this.room = submitAnswer(this.room, senderId, answerIndex);
    this.broadcast({ type: 'state-update', room: toPublicRoom(this.room) });

    // If all players answered early, reveal immediately
    if (allAnswered(this.room)) {
      this.clearRoundTimer();
      this.endRound();
    }
  }

  // ─── Round lifecycle ────────────────────────────────────────────────────────

  private startRound() {
    if (!this.room) return;
    this.room = beginRound(this.room);
    this.broadcast({ type: 'state-update', room: toPublicRoom(this.room) });

    // Auto-advance after 10 seconds if not everyone answered
    this.roundTimer = setTimeout(() => {
      this.endRound();
    }, ROUND_DURATION_MS);
  }

  private endRound() {
    if (!this.room) return;
    // Guard: only end a round that is currently in the question phase
    if (this.room.phase !== 'question') return;
    this.clearRoundTimer();
    this.room = revealRound(this.room);
    this.broadcast({ type: 'state-update', room: toPublicRoom(this.room) });

    // Show results for 3 seconds, then advance
    this.resultTimer = setTimeout(() => {
      this.resultTimer = null;
      if (!this.room) return;
      this.room = advanceRound(this.room);
      this.broadcast({ type: 'state-update', room: toPublicRoom(this.room) });

      if (this.room.phase === 'countdown') {
        // more rounds remain — begin next round
        this.startRound();
      }
      // if phase === 'final-result', game is over — no more timers
    }, 3000);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private clearRoundTimer() {
    if (this.roundTimer !== null) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.resultTimer !== null) {
      clearTimeout(this.resultTimer);
      this.resultTimer = null;
    }
  }

  private broadcast(msg: ServerMessage) {
    this.party.broadcast(JSON.stringify(msg));
  }

  private sendTo(conn: Party.Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

QuizRoom satisfies Party.Worker;
