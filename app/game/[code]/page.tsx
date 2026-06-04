"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { usePartySocket } from "@/hooks/usePartySocket";
import { useCountdown } from "@/hooks/useCountdown";
import { useSound } from "@/hooks/useSound";
import { QuestionCard } from "@/components/QuestionCard/QuestionCard";
import { CountdownRing } from "@/components/CountdownRing/CountdownRing";
import { Scoreboard } from "@/components/Scoreboard/Scoreboard";
import { NeonButton } from "@/components/NeonButton/NeonButton";
import { PublicGameRoom } from "@/types/game";
import styles from "./page.module.css";

function GamePageInner() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = params.code;
  const nickname = searchParams.get("name") || "Player";
  const avatar = searchParams.get("avatar") || "⚡";
  const isHost = searchParams.get("host") === "1";
  const joined = useRef(false);
  const prevConnected = useRef(false);
  // myId is resolved from state after the server confirms our rejoin.
  // We cannot use ?pid= because that was the lobby socket ID — the game page
  // opens a new connection, and rejoinGame() assigns a fresh socket ID.
  const [myId, setMyId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const { play, toggleMute, isMuted } = useSound();
  const prevPhaseRef = useRef<string | null>(null);
  const prevSecondsRef = useRef<number>(10);

  const { gameState, error, connected, send } = usePartySocket(code, (room: PublicGameRoom) => {
    if (room.phase === "final-result") {
      router.push("/results/" + code + "?name=" + encodeURIComponent(nickname) + "&avatar=" + encodeURIComponent(avatar));
    }
    // Resolve our own player ID by nickname each time state arrives.
    // This handles the lobby→game socket transition where the ID changes.
    const found = Object.keys(room.players).find(
      (id) => room.players[id].nickname === nickname
    );
    if (found) setMyId(found);
  });

  const isQuestionPhase = gameState?.phase === "question";
  const secondsLeft = useCountdown(gameState?.roundStartedAt ?? 0, isQuestionPhase);

  // Animated 3-2-1 countdown
  const [countdownNum, setCountdownNum] = useState(3);
  useEffect(() => {
    if (gameState?.phase !== "countdown") return;
    setCountdownNum(3);
    const t1 = setTimeout(() => setCountdownNum(2), 1000);
    const t2 = setTimeout(() => setCountdownNum(1), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [gameState?.phase]);

  useEffect(() => {
    if (connected && !prevConnected.current) {
      // Reset join flag on every fresh connection so reconnects also send join
      joined.current = false;
    }
    prevConnected.current = connected;
    if (connected && !joined.current) {
      joined.current = true;
      send({ type: "join", nickname, avatar });
    }
  }, [connected, nickname, avatar, send]);

  // Reset selected answer on new question
  useEffect(() => {
    setSelectedAnswer(null);
  }, [gameState?.currentQuestionIndex]);

  // ── Sound effects ──────────────────────────────────────────────────────────
  // Phase transition sounds
  useEffect(() => {
    if (!gameState) return;
    const phase = gameState.phase;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (prev === phase) return; // no change

    if (phase === "countdown") {
      // 3-2-1 ticks
      play("tick");
      const t1 = setTimeout(() => play("tick"), 1000);
      const t2 = setTimeout(() => play("tick"), 2000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (phase === "question") play("newQuestion");
    if (phase === "final-result") play("gameOver");
  }, [gameState?.phase, play]);

  // Answer reveal sound — fires when phase becomes "round-result"
  const prevRevealIndex = useRef<number | null>(null);
  useEffect(() => {
    if (gameState?.phase !== "round-result") return;
    const idx = gameState.currentQuestionIndex;
    if (prevRevealIndex.current === idx) return;
    prevRevealIndex.current = idx;

    const myPlayer = myId ? gameState.players[myId] : null;
    if (!myPlayer || myPlayer.answeredIndex === null) return;

    const correct = gameState.currentQuestion?.correctIndex;
    if (myPlayer.answeredIndex === correct) {
      play("correct");
    } else {
      play("wrong");
    }
  }, [gameState?.phase, gameState?.currentQuestionIndex, myId, gameState?.players, gameState?.currentQuestion, play]);

  // Countdown warning tick (last 5 seconds)
  useEffect(() => {
    if (!isQuestionPhase) return;
    if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== prevSecondsRef.current) {
      play("countdownBeep");
    }
    prevSecondsRef.current = secondsLeft;
  }, [secondsLeft, isQuestionPhase, play]);

  const handleMuteToggle = useCallback(() => {
    setMuted(toggleMute());
  }, [toggleMute]);

  // Sync muted state with stored value on mount
  useEffect(() => {
    setMuted(isMuted());
  }, [isMuted]);

  function handleAnswer(idx: number) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    send({ type: "answer", answerIndex: idx });
  }

  if (!gameState || gameState.phase === "lobby") {
    return (
      <main className={styles.centerPage}>
        <p className={styles.connecting}>{connected ? "Waiting for game to start..." : "Connecting..."}</p>
        {error && <p className={styles.error}>{error}</p>}
      </main>
    );
  }

  if (gameState.phase === "countdown") {
    return (
      <main className={styles.centerPage}>
        <div className={styles.countdownBig}>
          <p className={styles.getReady}>Get Ready!</p>
          <div className={styles.countdownNum} key={countdownNum} style={{ animation: "countdownPop 0.4s ease" }}>
            {countdownNum}
          </div>
        </div>
      </main>
    );
  }

  const q = gameState.currentQuestion;
  if (!q) return null;

  const myPlayer = myId ? gameState.players[myId] : null;
  // `answeredIndex` is 0-based; null means unanswered. Guard against myPlayer being undefined.
  const answered = myPlayer != null && myPlayer.answeredIndex !== null;
  const isReveal = gameState.phase === "round-result";

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.progress}>
          Q {gameState.currentQuestionIndex + 1} / {gameState.totalRounds}
        </div>
        {isQuestionPhase && <CountdownRing secondsLeft={secondsLeft} />}
        {isReveal && <div className={styles.revealLabel}>Round Result</div>}
        <button
          className={styles.muteBtn}
          onClick={handleMuteToggle}
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      <div className={styles.main}>
        <Scoreboard
          compact
          players={gameState.players}
          currentPlayerId={myId ?? undefined}
          showAnswered={isQuestionPhase}
        />

        <QuestionCard
          question={q.question}
          category={q.category}
          answers={q.answers}
          correctIndex={q.correctIndex}
          selectedIndex={selectedAnswer}
          onAnswer={handleAnswer}
          disabled={answered || isReveal || !isQuestionPhase}
        />

        {answered && isQuestionPhase && (
          <p className={styles.waitMsg}>Answer submitted! Waiting for others...</p>
        )}
      </div>
    </main>
  );
}


export default function GamePage() {
  return (
    <Suspense fallback={<div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center",color:"var(--text-muted)"}}>Loading...</div>}>
      <GamePageInner />
    </Suspense>
  );
}
