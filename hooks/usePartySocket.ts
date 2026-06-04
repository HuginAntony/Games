'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import PartySocket from 'partysocket';
import { PublicGameRoom, ClientMessage, ServerMessage } from '@/types/game';

const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'localhost:1999';

interface UsePartySocketReturn {
  gameState: PublicGameRoom | null;
  error: string | null;
  connected: boolean;
  send: (msg: ClientMessage) => void;
}

export function usePartySocket(
  roomCode: string | null,
  onStateUpdate?: (room: PublicGameRoom) => void
): UsePartySocketReturn {
  const [gameState, setGameState] = useState<PublicGameRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);

  // Keep a ref so the message handler always calls the *latest* callback
  // without needing to recreate the socket when the callback changes.
  const onStateUpdateRef = useRef(onStateUpdate);
  useEffect(() => {
    onStateUpdateRef.current = onStateUpdate;
  });

  useEffect(() => {
    if (!roomCode) return;

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomCode,
      party: 'game',
    });

    socketRef.current = socket;

    socket.addEventListener('open', () => setConnected(true));
    socket.addEventListener('close', () => setConnected(false));

    socket.addEventListener('message', (evt: MessageEvent<string>) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(evt.data) as ServerMessage;
      } catch {
        return;
      }
      if (msg.type === 'state-update') {
        setGameState(msg.room);
        onStateUpdateRef.current?.(msg.room);
      } else if (msg.type === 'error') {
        setError(msg.message);
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
      setConnected(false);
      setGameState(null);
    };
  }, [roomCode]);

  const send = useCallback((msg: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  }, []);

  return { gameState, error, connected, send };
}

