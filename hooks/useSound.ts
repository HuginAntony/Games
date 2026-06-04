'use client';

import { useRef, useCallback, useEffect } from 'react';

type SoundName = 'tick' | 'correct' | 'wrong' | 'newQuestion' | 'gameOver' | 'countdownBeep';

// All sounds are synthesised with the Web Audio API — no audio files needed.
function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  gainPeak: number,
  duration: number,
  startOffset = 0,
  freqEnd?: number,
) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, now + duration);
  }

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function synthesise(ctx: AudioContext, name: SoundName) {
  switch (name) {
    case 'tick':
      // Short high-pitched click — one per countdown second
      playTone(ctx, 'sine', 880, 0.15, 0.08);
      break;

    case 'countdownBeep':
      // Lower tick for the in-question countdown (every 5 s warning)
      playTone(ctx, 'square', 440, 0.08, 0.06);
      break;

    case 'correct':
      // Rising two-note ding: C5 → E5
      playTone(ctx, 'sine', 523, 0.25, 0.18, 0);
      playTone(ctx, 'sine', 659, 0.3,  0.28, 0.12);
      break;

    case 'wrong':
      // Descending buzz
      playTone(ctx, 'sawtooth', 200, 0.2, 0.25, 0, 80);
      break;

    case 'newQuestion':
      // Short upward sweep (whoosh)
      playTone(ctx, 'sine', 300, 0.15, 0.3, 0, 600);
      break;

    case 'gameOver':
      // Short fanfare: C5, E5, G5, C6
      playTone(ctx, 'triangle', 523, 0.3, 0.18, 0);
      playTone(ctx, 'triangle', 659, 0.3, 0.18, 0.15);
      playTone(ctx, 'triangle', 784, 0.3, 0.18, 0.30);
      playTone(ctx, 'triangle', 1047, 0.4, 0.4,  0.45);
      break;
  }
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef<boolean>(false);

  // Initialise mute state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    mutedRef.current = localStorage.getItem('quizblitz-muted') === 'true';
  }, []);

  // Lazily create AudioContext on first user interaction (browser requirement)
  const getCtx = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      ctxRef.current = createAudioContext();
    }
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((name: SoundName) => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    try {
      synthesise(ctx, name);
    } catch {
      // AudioContext errors are non-fatal
    }
  }, [getCtx]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizblitz-muted', String(mutedRef.current));
    }
    return mutedRef.current;
  }, []);

  const isMuted = useCallback(() => mutedRef.current, []);

  return { play, toggleMute, isMuted };
}
