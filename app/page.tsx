"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NeonButton } from "@/components/NeonButton/NeonButton";
import { generateCode } from "@/lib/room-factory";
import styles from "./page.module.css";

type Mode = "home" | "solo" | "create" | "join";

const AVATARS = ["⚡", "🦊", "🐉", "🚀", "🎯", "🌟", "🔥", "🦁", "🐺", "🦋", "🎮", "🌈", "💀", "🤖", "👾", "🎸", "🧙", "🐬", "🦄", "🐙"];

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("home");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("⚡");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [soloRounds, setSoloRounds] = useState(10);

  function handleSolo() {
    const name = nickname.trim();
    if (!name) { setError("Enter a nickname first"); return; }
    router.push("/game/solo?name=" + encodeURIComponent(name) + "&avatar=" + encodeURIComponent(avatar) + "&rounds=" + soloRounds);
  }

  function handleCreate() {
    const name = nickname.trim();
    if (!name) { setError("Enter a nickname first"); return; }
    const code = generateCode();
    router.push("/lobby/" + code + "?name=" + encodeURIComponent(name) + "&avatar=" + encodeURIComponent(avatar) + "&host=1");
  }

  function handleJoin() {
    const name = nickname.trim();
    const code = roomCode.trim().toUpperCase();
    if (!name) { setError("Enter a nickname first"); return; }
    if (code.length < 4) { setError("Enter a valid room code"); return; }
    router.push("/lobby/" + code + "?name=" + encodeURIComponent(name) + "&avatar=" + encodeURIComponent(avatar));
  }

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.icon}>&#9889;</div>
        <h1 className={styles.title}>Quiz<span className={styles.accent}>Blitz</span></h1>
        <p className={styles.subtitle}>10 questions &middot; 10 seconds each &middot; General Knowledge</p>
      </div>
      <div className={styles.card}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="nickname">Your Nickname</label>
          <input
            id="nickname"
            className={styles.input}
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setError(""); }}
            placeholder="Enter nickname..."
            maxLength={20}
            autoComplete="off"
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Choose Avatar</label>
          <div className={styles.avatarGrid}>
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={styles.avatarBtn + (avatar === emoji ? " " + styles.avatarSelected : "")}
                onClick={() => setAvatar(emoji)}
                aria-label={emoji}
              >{emoji}</button>
            ))}
          </div>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {mode === "home" && (
          <div className={styles.modeGrid}>
            <NeonButton variant="cyan" onClick={() => { setError(""); setMode("solo"); }} fullWidth>Solo Play</NeonButton>
            <NeonButton variant="pink" onClick={() => { setError(""); setMode("create"); }} fullWidth>Create Room</NeonButton>
            <NeonButton variant="ghost" onClick={() => { setError(""); setMode("join"); }} fullWidth>Join Room</NeonButton>
          </div>
        )}
        {mode === "solo" && (
          <div className={styles.actionGroup}>
            <div className={styles.roundSelector}>
              <span className={styles.roundLabel}>Number of Questions</span>
              <div className={styles.roundBtns}>
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={styles.roundBtn + (soloRounds === n ? " " + styles.roundBtnActive : "")}
                    onClick={() => setSoloRounds(n)}
                  >{n}</button>
                ))}
              </div>
            </div>
            <NeonButton variant="cyan" fullWidth onClick={handleSolo}>Start Solo Game</NeonButton>
            <NeonButton variant="ghost" onClick={() => setMode("home")}>&larr; Back</NeonButton>
          </div>
        )}
        {mode === "create" && (
          <div className={styles.actionGroup}>
            <NeonButton variant="pink" fullWidth onClick={handleCreate}>Create Room</NeonButton>
            <NeonButton variant="ghost" onClick={() => setMode("home")}>&larr; Back</NeonButton>
          </div>
        )}
        {mode === "join" && (
          <div className={styles.actionGroup}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="roomCode">Room Code</label>
              <input
                id="roomCode"
                className={styles.input + " " + styles.codeInput}
                value={roomCode}
                onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(""); }}
                placeholder="ABCD12"
                maxLength={6}
                autoComplete="off"
              />
            </div>
            <NeonButton variant="cyan" fullWidth onClick={handleJoin}>Join Room</NeonButton>
            <NeonButton variant="ghost" onClick={() => setMode("home")}>&larr; Back</NeonButton>
          </div>
        )}
      </div>
    </main>
  );
}
