'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import PartySocket from 'partysocket';
import { PublicGameRoom, ClientMessage, ServerMessage } from '@/types/game';
import { resolveMultiplayerHost } from '@/lib/multiplayer-host';

interface UsePartySocketReturn {
  gameState: PublicGameRoom | null; error: string | null; connected: boolean;
  myId: string | null; ownAnswer: number | null; pendingAnswer: boolean;
  send: (msg: ClientMessage) => void;
}
export function usePartySocket(roomCode: string | null, onStateUpdate?: (room: PublicGameRoom) => void): UsePartySocketReturn {
  const [gameState, setGameState] = useState<PublicGameRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [ownAnswer, setOwnAnswer] = useState<number | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);
  const stateRef = useRef<PublicGameRoom | null>(null);
  const profileRef = useRef<Extract<ClientMessage, { type: 'join' }> | null>(null);
  const sessionRef = useRef('');
  const persistProfileRef = useRef<() => void>(() => {});
  const callbackRef = useRef(onStateUpdate);
  useEffect(() => { callbackRef.current = onStateUpdate; });
  useEffect(() => {
    if (!roomCode) return;
    const endpoint = resolveMultiplayerHost(process.env.NEXT_PUBLIC_MULTIPLAYER_HOST, process.env.NEXT_PUBLIC_PARTYKIT_HOST, window.location);
    if ('error' in endpoint) { setError(endpoint.error ?? 'Multiplayer is not configured.'); return; }
    let connectionTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const clearConnectionTimer = () => { clearTimeout(connectionTimer); connectionTimer = undefined; };
    const watchConnection = () => {
      if (disposed || connectionTimer !== undefined) return;
      connectionTimer = setTimeout(() => {
        connectionTimer = undefined;
        setError('The multiplayer server is not responding. Check your connection. The site owner should verify the Cloudflare Worker deployment and NEXT_PUBLIC_MULTIPLAYER_HOST in Vercel. Reconnection will continue automatically.');
      }, 12000);
    };
    watchConnection();
    const storageKey = `wisquiz:seat:${roomCode}`;
    let session: string;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      session = saved?.session;
      profileRef.current = saved?.profile ?? null;
    } catch { session = ''; }
    if (!session || !/^[a-f0-9]{64}$/.test(session)) {
      session = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    }
    const persistProfile = () => { try { localStorage.setItem(storageKey, JSON.stringify({ session, profile: profileRef.current })); } catch { /* This browser session still works if storage is unavailable. */ } };
    sessionRef.current = session;
    persistProfileRef.current = persistProfile;
    persistProfile();
    const socket = new PartySocket({ host: endpoint.host, protocol: endpoint.protocol, room: roomCode, party: 'game' });
    socketRef.current = socket;
    socket.addEventListener('open', () => {
      setConnected(true);
      if (profileRef.current) socket.send(JSON.stringify({ ...profileRef.current, session }));
    });
    socket.addEventListener('close', () => { setConnected(false); setPendingAnswer(false); watchConnection(); });
    socket.addEventListener('message', (event: MessageEvent<string>) => {
      let message: ServerMessage;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'state-update') {
        clearConnectionTimer(); setError(null);
        stateRef.current = message.room;
        setGameState(message.room);
        if (message.selfId) setMyId(message.selfId);
        setOwnAnswer(message.ownAnswer ?? null);
        if (message.ownAnswer !== null && message.ownAnswer !== undefined || message.room.phase !== 'question') setPendingAnswer(false);
        callbackRef.current?.(message.room);
      } else if (message.type === 'answer-accepted') {
        if (message.questionIndex === stateRef.current?.currentQuestionIndex) setOwnAnswer(message.answerIndex);
        setPendingAnswer(false);
      } else if (message.type === 'error') { clearConnectionTimer(); setError(message.message); setPendingAnswer(false); }
    });
    return () => {
      disposed = true;
      clearConnectionTimer();
      socket.close(); socketRef.current = null; stateRef.current = null;
      setConnected(false); setGameState(null); setMyId(null); setOwnAnswer(null); setPendingAnswer(false);
    };
  }, [roomCode]);
  const send = useCallback((message: ClientMessage) => {
    setError(null);
    if (message.type === 'join') {
      profileRef.current = message;
      persistProfileRef.current();
      message = { ...message, session: sessionRef.current };
    }
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) { setError('Connecting to the party. Try again in a moment.'); return; }
    if (message.type === 'answer') {
      setPendingAnswer(true);
      message = { ...message, questionIndex: message.questionIndex ?? stateRef.current?.currentQuestionIndex };
    }
    if (message.type === 'leave' && roomCode) {
      profileRef.current = null;
      try { localStorage.removeItem(`wisquiz:seat:${roomCode}`); } catch { /* no persistent storage */ }
    }
    socketRef.current.send(JSON.stringify(message));
  }, [roomCode]);
  return { gameState, error, connected, myId, ownAnswer, pendingAnswer, send };
}
