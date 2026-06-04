"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { usePartySocket } from "@/hooks/usePartySocket";
import { NeonButton } from "@/components/NeonButton/NeonButton";
import { QRCode } from "@/components/QRCode/QRCode";
import { PublicGameRoom, MAX_PLAYERS } from "@/types/game";
import styles from "./page.module.css";

const AVATARS = ["⚡", "🦊", "🐉", "🚀", "🎯", "🌟", "🔥", "🦁", "🐺", "🦋", "🎮", "🌈", "💀", "🤖", "👾", "🎸", "🧙", "🐬", "🦄", "🐙"];

function LobbyPageInner() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = params.code.toUpperCase();
  const isHost = searchParams.get("host") === "1";
  const joined = useRef(false);
  const prevConnected = useRef(false);
  const [roundCount, setRoundCount] = useState(10);

  // If arriving via QR code, name won't be in the URL — show entry form first
  const [nickname, setNickname] = useState(searchParams.get("name") || "");
  const [avatar, setAvatar] = useState(searchParams.get("avatar") || "⚡");
  const [ready, setReady] = useState(!!searchParams.get("name"));
  const [nameError, setNameError] = useState("");

  const { gameState, error, connected, send } = usePartySocket(code, (room: PublicGameRoom) => {
    if (room.phase === "question" || room.phase === "countdown") {
      router.push("/game/" + code + "?name=" + encodeURIComponent(nickname) + "&avatar=" + encodeURIComponent(avatar) + (isHost ? "&host=1" : ""));
    }
  });

  useEffect(() => {
    if (connected && !prevConnected.current) {
      // Reset join flag on every fresh connection so reconnects also send join
      joined.current = false;
    }
    prevConnected.current = connected;
    if (connected && !joined.current && ready) {
      joined.current = true;
      send({ type: "join", nickname, avatar });
    }
  }, [connected, nickname, avatar, send, ready]);

  function handleEnterLobby() {
    const name = nickname.trim();
    if (!name) { setNameError("Enter a nickname first"); return; }
    setNickname(name);
    setReady(true);
  }

  function copyCode() {
    navigator.clipboard.writeText(code).catch(() => {});
  }

  const players = gameState ? Object.values(gameState.players) : [];

  // QR code joiners: show name/avatar entry before joining the room
  if (!ready) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <h1>Join Game</h1>
          <p className={styles.joinRoomCode}>Room: <strong>{code}</strong></p>
        </div>
        <div className={styles.joinForm}>
          <div className={styles.joinField}>
            <label className={styles.joinLabel} htmlFor="qr-nickname">Your Nickname</label>
            <input
              id="qr-nickname"
              className={styles.joinInput}
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setNameError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleEnterLobby()}
              placeholder="Enter nickname..."
              maxLength={20}
              autoComplete="off"
              autoFocus
            />
          </div>
          <div className={styles.joinField}>
            <label className={styles.joinLabel}>Choose Avatar</label>
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
          {nameError && <p className={styles.error}>{nameError}</p>}
          <NeonButton variant="cyan" fullWidth onClick={handleEnterLobby}>Join Room</NeonButton>
          <NeonButton variant="ghost" onClick={() => router.push("/")}>Home</NeonButton>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1>Waiting Room</h1>
        <div className={styles.codeBox} onClick={copyCode} title="Click to copy">
          <span className={styles.codeLabel}>Room Code</span>
          <span className={styles.code}>{code}</span>
          <span className={styles.copyHint}>&#x1F4CB; Copy</span>
        </div>
        <QRCode code={code} />
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {!connected && <p className={styles.connecting}>Connecting...</p>}

      <div className={styles.playerList}>
        <h2 className={styles.playersTitle}>Players ({players.length}/{gameState?.maxPlayers ?? MAX_PLAYERS})</h2>
        <ul className={styles.players}>
          {players.map((p) => (
            <li key={p.id} className={styles.playerRow}>
              <span className={styles.playerAvatar}>{p.avatar}</span>
              <span className={styles.playerName}>{p.nickname}</span>
              {p.isHost && <span className={styles.hostBadge}>HOST</span>}
            </li>
          ))}
        </ul>
        {players.length === 0 && connected && (
          <p className={styles.waiting}>Joining room...</p>
        )}
      </div>

      {isHost && (
        <div className={styles.actions}>
          <div className={styles.roundSelector}>
            <span className={styles.roundLabel}>Questions</span>
            <div className={styles.roundBtns}>
              {[5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  className={styles.roundBtn + (roundCount === n ? " " + styles.roundBtnActive : "")}
                  onClick={() => setRoundCount(n)}
                >{n}</button>
              ))}
            </div>
          </div>
          <NeonButton
            variant="pink"
            fullWidth
            disabled={players.length < 1 || !connected}
            onClick={() => send({ type: "start", rounds: roundCount })}
          >
            Start Game {players.length > 1 ? "(" + players.length + " players)" : ""}
          </NeonButton>
          <p className={styles.hint}>Share the room code with friends to play together</p>
        </div>
      )}
      {!isHost && (
        <p className={styles.hint}>Waiting for the host to start the game...</p>
      )}

      <NeonButton variant="ghost" onClick={() => router.push("/")}>Leave Room</NeonButton>
    </main>
  );
}


export default function LobbyPage() {
  return (
    <Suspense fallback={<div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center",color:"var(--text-muted)"}}>Loading...</div>}>
      <LobbyPageInner />
    </Suspense>
  );
}
