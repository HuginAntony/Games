"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchQuestions } from "@/lib/questions";
import { calculateScore } from "@/lib/scoring";
import { QuestionCard } from "@/components/QuestionCard/QuestionCard";
import { CountdownRing } from "@/components/CountdownRing/CountdownRing";
import { NeonButton } from "@/components/NeonButton/NeonButton";
import { Question, ROUND_DURATION_MS } from "@/types/game";
import styles from "../[code]/page.module.css";
import soloStyles from "./solo.module.css";

type SoloPhase = "loading" | "question" | "reveal" | "done";

function SoloGamePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const nickname = searchParams.get("name") || "Player";
  const avatar = searchParams.get("avatar") || "";
  const rounds = Math.max(1, Math.min(50, parseInt(searchParams.get("rounds") || "10", 10)));

  const [phase, setPhase] = useState<SoloPhase>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [roundStart, setRoundStart] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    fetchQuestions(rounds)
      .then((qs) => {
        console.log('Questions loaded:', qs);
        if (!Array.isArray(qs) || qs.length === 0) {
          throw new Error('Invalid questions data received');
        }
        setQuestions(qs);
        startRound(0, qs);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Failed to load questions:', msg);
        setFetchError(`Failed to load questions: ${msg}`);
      });
  }, []);

  function startRound(questionIdx: number, qs?: Question[]) {
    setIdx(questionIdx);
    setSelected(null);
    setPhase("question");
    const start = Date.now();
    setRoundStart(start);
    setSecondsLeft(10);
    setTimerActive(true);
  }

  const handleTimerEnd = useCallback(() => {
    setTimerActive(false);
    setPhase("reveal");
    setTimeout(() => advanceOrFinish(), 2500);
  }, [idx]);

  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((ROUND_DURATION_MS - (Date.now() - roundStart)) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        handleTimerEnd();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [timerActive, roundStart, handleTimerEnd]);

  function handleAnswer(answerIdx: number) {
    if (selected !== null) return;
    setTimerActive(false);
    setSelected(answerIdx);
    const q = questions[idx];
    if (answerIdx === q.correctIndex) {
      const secs = Math.max(0, Math.ceil((ROUND_DURATION_MS - (Date.now() - roundStart)) / 1000));
      setScore((s) => s + calculateScore(secs));
    }
    setPhase("reveal");
    setTimeout(() => advanceOrFinish(), 2500);
  }

  function advanceOrFinish() {
    const next = idx + 1;
    if (next >= questions.length) {
      // Save high score to localStorage
      const key = "quizblitz:highscore:" + nickname;
      const prev = parseInt(localStorage.getItem(key) || "0", 10);
      setScore((s) => {
        const finalScore = s;
        if (finalScore > prev) localStorage.setItem(key, String(finalScore));
        return finalScore;
      });
      setPhase("done");
    } else {
      startRound(next);
    }
  }

  if (fetchError) {
    return (
      <main className={styles.centerPage}>
        <p className={soloStyles.error}>{fetchError}</p>
        <NeonButton variant="cyan" onClick={() => router.push("/")}>Go Home</NeonButton>
      </main>
    );
  }

  if (phase === "loading") {
    return (
      <main className={styles.centerPage}>
        <p className={styles.connecting}>Loading questions...</p>
      </main>
    );
  }

  if (phase === "done") {
    const highScore = parseInt(localStorage.getItem("quizblitz:highscore:" + nickname) || "0", 10);
    return (
      <main className={soloStyles.donePage}>
        <div className={soloStyles.trophy}>&#x1F3C6;</div>
        <h1 className={soloStyles.doneTitle}>Well Played, {nickname}!</h1>
        <div className={soloStyles.scoreBox}>
          <span className={soloStyles.scoreLabel}>Your Score</span>
          <span className={soloStyles.scoreVal}>{score.toLocaleString()}</span>
        </div>
        <div className={soloStyles.scoreBox}>
          <span className={soloStyles.scoreLabel}>Personal Best</span>
          <span className={soloStyles.scoreVal}>{highScore.toLocaleString()}</span>
        </div>
        <div className={soloStyles.doneActions}>
          <NeonButton variant="cyan" onClick={() => router.push("/game/solo?name=" + encodeURIComponent(nickname) + "&avatar=" + encodeURIComponent(avatar) + "&rounds=" + rounds)}>Play Again</NeonButton>
          <NeonButton variant="ghost" onClick={() => router.push("/")}>Home</NeonButton>
        </div>
      </main>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <main className={styles.centerPage}>
        <p className={styles.connecting}>Loading questions...</p>
      </main>
    );
  }

  if (idx < 0 || idx >= questions.length) {
    return (
      <main className={styles.centerPage}>
        <p className={soloStyles.error}>Error: Invalid question index</p>
        <NeonButton variant="cyan" onClick={() => router.push("/")}>Go Home</NeonButton>
      </main>
    );
  }

  const q = questions[idx];
  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.progress}>Q {idx + 1} / {rounds}</div>
        {phase === "question" && <CountdownRing secondsLeft={secondsLeft} />}
        {phase === "reveal" && <div className={styles.revealLabel}>Round Result</div>}
        <div className={soloStyles.liveScore}>{score.toLocaleString()} pts</div>
      </div>
      <div className={styles.main}>
        <QuestionCard
          question={q.question}
          category={q.category}
          answers={q.answers}
          correctIndex={phase === "reveal" ? q.correctIndex : undefined}
          selectedIndex={selected}
          onAnswer={handleAnswer}
          disabled={phase === "reveal" || selected !== null}
        />
      </div>
    </main>
  );
}


export default function SoloGamePage() {
  return (
    <Suspense fallback={<div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center",color:"var(--text-muted)"}}>Loading...</div>}>
      <SoloGamePageInner />
    </Suspense>
  );
}
