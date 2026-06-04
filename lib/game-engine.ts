import {
  GameRoom,
  Player,
  Question,
  PublicGameRoom,
  ClientQuestion,
  ROUND_DURATION_MS,
  MAX_PLAYERS,
  TOTAL_ROUNDS,
} from '@/types/game';
import { calculateScore } from '@/lib/scoring';

// ─── Pure state-machine functions ────────────────────────────────────────────
// Each function takes the current state and returns a new state object.
// No side effects. Easily unit-testable.

export function createRoom(code: string, hostId: string, hostname: string, avatar = '⚡'): GameRoom {
  const host: Player = {
    id: hostId,
    nickname: hostname,
    avatar,
    score: 0,
    answeredIndex: null,
    isHost: true,
  };
  return {
    code,
    phase: 'lobby',
    hostId,
    players: { [hostId]: host },
    questions: [],
    currentQuestionIndex: 0,
    roundStartedAt: 0,
    maxPlayers: MAX_PLAYERS,
    totalRounds: TOTAL_ROUNDS,
  };
}

export function joinRoom(room: GameRoom, playerId: string, nickname: string, avatar = '⚡'): GameRoom {
  if (room.phase !== 'lobby') {
    throw new Error('Game already in progress');
  }
  if (Object.keys(room.players).length >= room.maxPlayers) {
    throw new Error('Room is full');
  }
  const trimmed = nickname.trim().slice(0, 20);
  if (!trimmed) throw new Error('Nickname required');

  const player: Player = {
    id: playerId,
    nickname: trimmed,
    avatar,
    score: 0,
    answeredIndex: null,
    isHost: false,
  };
  return {
    ...room,
    players: { ...room.players, [playerId]: player },
  };
}

export function removePlayer(room: GameRoom, playerId: string): GameRoom {
  const { [playerId]: _removed, ...rest } = room.players;
  // If host leaves, assign a new host (first remaining player)
  let newHostId = room.hostId;
  let newPlayers = { ...rest };
  if (room.hostId === playerId) {
    const ids = Object.keys(newPlayers);
    if (ids.length > 0) {
      newHostId = ids[0];
      newPlayers = {
        ...newPlayers,
        [newHostId]: { ...newPlayers[newHostId], isHost: true },
      };
    }
  }
  return { ...room, players: newPlayers, hostId: newHostId };
}

export function startGame(room: GameRoom, questions: Question[]): GameRoom {
  if (room.phase !== 'lobby') throw new Error('Game already started');
  const resetPlayers: Record<string, Player> = {};
  for (const [id, p] of Object.entries(room.players)) {
    resetPlayers[id] = { ...p, score: 0, answeredIndex: null };
  }
  return {
    ...room,
    phase: 'countdown',
    questions,
    currentQuestionIndex: 0,
    players: resetPlayers,
  };
}

export function beginRound(room: GameRoom): GameRoom {
  const resetPlayers: Record<string, Player> = {};
  for (const [id, p] of Object.entries(room.players)) {
    resetPlayers[id] = { ...p, answeredIndex: null };
  }
  return {
    ...room,
    phase: 'question',
    players: resetPlayers,
    roundStartedAt: Date.now(),
  };
}

export function submitAnswer(
  room: GameRoom,
  playerId: string,
  answerIndex: number
): GameRoom {
  if (room.phase !== 'question') return room;
  const player = room.players[playerId];
  if (!player) return room;
  if (player.answeredIndex !== null) return room; // already answered

  const question = room.questions[room.currentQuestionIndex];
  const isCorrect = answerIndex === question.correctIndex;
  const secondsRemaining = Math.max(
    0,
    Math.floor((ROUND_DURATION_MS - (Date.now() - room.roundStartedAt)) / 1000)
  );
  const points = isCorrect ? calculateScore(secondsRemaining) : 0;

  const updatedPlayer: Player = {
    ...player,
    answeredIndex: answerIndex,
    score: player.score + points,
  };

  return {
    ...room,
    players: { ...room.players, [playerId]: updatedPlayer },
  };
}

export function revealRound(room: GameRoom): GameRoom {
  return { ...room, phase: 'round-result' };
}

export function advanceRound(room: GameRoom): GameRoom {
  const next = room.currentQuestionIndex + 1;
  if (next >= room.totalRounds) {
    return { ...room, phase: 'final-result' };
  }
  // Return to lobby-like waiting state; beginRound() will set phase to 'question'
  return { ...room, phase: 'countdown', currentQuestionIndex: next };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a PublicGameRoom safe to broadcast (strips correctIndex during 'question' phase) */
export function toPublicRoom(room: GameRoom): PublicGameRoom {
  const q = room.questions[room.currentQuestionIndex] ?? null;
  let currentQuestion: ClientQuestion | null = null;
  if (q) {
    currentQuestion = {
      category: q.category,
      question: q.question,
      answers: q.answers,
      // Only reveal correct answer after the active round ends
      correctIndex:
        room.phase === 'round-result' || room.phase === 'final-result'
          ? q.correctIndex
          : undefined,
    };
  }
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    players: room.players,
    currentQuestion,
    currentQuestionIndex: room.currentQuestionIndex,
    totalRounds: room.totalRounds,
    roundStartedAt: room.roundStartedAt,
    maxPlayers: room.maxPlayers,
  };
}

/** All players have submitted an answer */
export function allAnswered(room: GameRoom): boolean {
  return Object.values(room.players).every((p) => p.answeredIndex !== null);
}

/**
 * Re-associate an existing player with a new socket connection ID.
 * Called when a player navigates from lobby→game (new WS connection)
 * or refreshes the game page. Preserves score, answeredIndex, etc.
 * Throws if no player with the given nickname is found.
 */
export function rejoinGame(room: GameRoom, newSocketId: string, nickname: string): GameRoom {
  const normalized = nickname.trim().slice(0, 20);
  const entry = Object.entries(room.players).find(
    ([, p]) => p.nickname === normalized
  );
  if (!entry) throw new Error('Player not found in this game');

  const [oldId, player] = entry;
  const { [oldId]: _removed, ...rest } = room.players;
  const updatedPlayer: Player = { ...player, id: newSocketId };
  const newHostId = room.hostId === oldId ? newSocketId : room.hostId;

  return {
    ...room,
    players: { ...rest, [newSocketId]: updatedPlayer },
    hostId: newHostId,
  };
}
