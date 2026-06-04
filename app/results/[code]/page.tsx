"use client";

import { Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { usePartySocket } from "@/hooks/usePartySocket";
import { TrophyBanner } from "@/components/TrophyBanner/TrophyBanner";
import { Podium } from "@/components/Podium/Podium";
import { NeonButton } from "@/components/NeonButton/NeonButton";
import { Player } from "@/types/game";
import styles from "./page.module.css";

function ResultsPageInner() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = params.code;
  const nickname = searchParams.get("name") || "Player";

  // Connect to receive the final state — DO NOT send a join message because
  // the game is already finished and joinRoom() would throw "Game already in progress".
  // The party server's onConnect() sends the current state immediately to every new connection.
  const { gameState } = usePartySocket(code);

  const players: Player[] = gameState
    ? Object.values(gameState.players).sort((a, b) => b.score - a.score)
    : [];

  const winner = players[0] ?? null;
  const isWinner = winner?.nickname === nickname;

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Game Over</h1>

      {winner && (
        <TrophyBanner winner={winner} isCurrentPlayer={isWinner} />
      )}

      {players.length > 0 && (
        <Podium players={players.slice(0, 3)} nickname={nickname} />
      )}

      <div className={styles.leaderboard}>
        <h2 className={styles.lbTitle}>Final Scores</h2>
        <ol className={styles.lbList}>
          {players.map((p, idx) => (
            <li
              key={p.id}
              className={styles.lbRow + (p.nickname === nickname ? (" " + styles.me) : "")}
              style={{ animationDelay: (idx * 0.08) + "s" }}
            >
              <span className={styles.lbRank}>
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "#" + (idx + 1)}
              </span>
              <span className={styles.lbAvatar}>{p.avatar}</span>
              <span className={styles.lbName}>{p.nickname}</span>
              <span className={styles.lbScore}>{p.score.toLocaleString()} pts</span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.actions}>
        <NeonButton variant="cyan" onClick={() => router.push("/")}>Play Again</NeonButton>
        <NeonButton variant="ghost" onClick={() => router.push("/")}>Home</NeonButton>
      </div>
    </main>
  );
}


export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center",color:"var(--text-muted)"}}>Loading...</div>}>
      <ResultsPageInner />
    </Suspense>
  );
}
