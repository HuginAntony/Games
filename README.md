# QuizBlitz ⚡

A real-time multiplayer quiz game built with **Next.js 16**, **PartyKit** (WebSockets), and a neon dark-theme UI. Supports up to **12 simultaneous players**, solo practice mode, time-bonus scoring, and a final leaderboard with confetti.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Bug Fixes (changelog)](#bug-fixes-changelog)
4. [UI Improvements](#ui-improvements)
5. [Getting Started](#getting-started)
6. [Running Tests](#running-tests)
7. [Deployment](#deployment)
8. [Suggested Future Improvements](#suggested-future-improvements)

---

## Features

| Feature | Details |
|---|---|
| **Multiplayer** | Up to 12 players per room via PartyKit WebSockets |
| **Solo mode** | Single-player practice with local high-score saved to `localStorage` |
| **10 questions** | Fetched from the Open Trivia DB with retry + back-off logic |
| **10-second timer** | Per-question countdown ring synced to server time |
| **Time-bonus scoring** | 100 base + 10 pts/second remaining (max 200 pts/question) |
| **Animated countdown** | 3 to 2 to 1 pop animation before each question |
| **Live scoreboard** | Shows scores + answered/thinking indicators during question phase |
| **Answer reveal** | Correct answer highlighted with glow; wrong answer shakes |
| **Confetti** | Fires for the winning player on the results screen |
| **Room codes** | 6-character, unambiguous codes (no O/0, I/1 confusion) |

---

## Architecture

```
Browser (Next.js)
  app/page.tsx          <- Home / room creation
  app/lobby/[code]      <- Waiting room
  app/game/[code]       <- Live multiplayer game view
  app/game/solo         <- Solo mode (no WebSocket)
  app/results/[code]    <- Final leaderboard
  hooks/usePartySocket  <- WebSocket connection manager
  hooks/useCountdown    <- Server-synced countdown timer
  components/           <- QuestionCard, Scoreboard, CountdownRing,
                           NeonButton, TrophyBanner

PartyKit Server (party/game.ts)
  State machine: lobby -> countdown -> question ->
                 round-result -> (repeat) -> final-result
  lib/game-engine.ts  <- Pure state-machine functions
  lib/opentdb.ts      <- Direct OpenTDB fetch (no relative URLs)
  lib/scoring.ts      <- Time-bonus calculation

Open Trivia DB (opentdb.com)
  Free API, no key required
```

### Key Design Decisions

- **Pure state machine** (`lib/game-engine.ts`) — every state transition is a pure function with no side effects, making it easy to test and reason about.
- **Server controls the clock** — `roundStartedAt` (epoch ms) is stored in room state and broadcast. Each browser derives its countdown from it, so late-joiners see the correct remaining time.
- **Correct answer hidden during question phase** — `toPublicRoom()` strips `correctIndex` while `phase === 'question'`. It is only sent on `round-result`.
- **Player ID via URL param** — after joining the lobby, the player's WebSocket ID is passed as `?pid=` to the game URL so the game page always knows which player it is without fragile nickname-matching.

---

## Bug Fixes (changelog)

### Critical

| # | Bug | Root cause | Fix |
|---|---|---|---|
| 1 | **Multiplayer games never started** — `fetchQuestions` failed silently | `lib/questions.ts` called `/api/questions` (relative URL) from the PartyKit server process, which has no Next.js context | Created `lib/opentdb.ts` that fetches OpenTDB directly with absolute URL. Both the party server and Next.js API route now use it |
| 2 | **Answer buttons always disabled** | `myId` started `null`, so `myPlayer?.answeredIndex !== null` evaluated `undefined !== null = true` permanently | Initialize `myId` from `?pid=` URL param (lobby already provides it). Fixed guard to `myPlayer != null && myPlayer.answeredIndex !== null` |
| 3 | **Stale callback in `usePartySocket`** | `onStateUpdate` captured in a `useEffect` closure that only ran once (on mount), freezing all state references | Replaced with a `useRef` pattern — the socket listener calls `onStateUpdateRef.current?.()` which always points to the latest callback |
| 4 | **Results leaderboard was empty** | Results page sent a `join` message; `joinRoom()` throws "Game already in progress" | Results page now only opens a WebSocket connection. The server sends full state via `onConnect` without needing a join |
| 5 | **`endRound` could fire twice / timer leaked** | The 3-second reveal `setTimeout` was untracked | Added `private resultTimer` field; `clearRoundTimer()` now clears both round and result timers. Added phase guard in `endRound()` |
| 10 | **Players dropped from game on lobby→game navigation** | When a player navigates from the lobby page to the game page the lobby WebSocket closes, triggering `onClose` which removed the player from the room. The game page then opened a new connection with a different socket ID, and `joinRoom()` rejected it with "Game already in progress" | `onClose` now only removes players when `phase === 'lobby'`. `handleJoin` calls `rejoinGame()` (new function in `game-engine.ts`) when the game is already running — this swaps the old socket ID for the new one by matching on nickname. `myId` in the game page is resolved by nickname-matching on every state update rather than from a URL parameter |

### Minor

| # | Bug | Fix |
|---|---|---|
| 6 | `MAX_PLAYERS = 8` | Raised to 12 |
| 7 | Lobby hardcoded `"/8"` | Now reads `gameState?.maxPlayers ?? MAX_PLAYERS` |
| 8 | Countdown showed a static `"3"` | Added `countdownNum` state with animated 3 → 2 → 1 transitions |
| 9 | `maxPlayers` missing from `PublicGameRoom` type | Added to type + `toPublicRoom()` |

---

## UI Improvements

| Improvement | Description |
|---|---|
| **Animated 3-2-1** | Numbers pop in with a `countdownPop` CSS keyframe (scale from 1.6 to 1) |
| **Answered indicators** | Scoreboard shows a green dot (answered) or blinking grey dot (thinking) during the question phase |
| **Score pulse animation** | When scores increase the number briefly scales up and turns green |
| **Confetti** | `canvas-confetti` fires for the winning player on the results screen via `TrophyBanner` |
| **Answer reveal** | Correct answer glows green with a 3-D flip; wrong selected answer shakes red |
| **Shared keyframes** | `countdownPop`, `fadeSlideUp`, `scorePulse`, `shake` defined once in `globals.css` |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Development

Start both servers concurrently (recommended):

```bash
npm run dev
```

- Next.js app: http://localhost:3000
- PartyKit WebSocket server: localhost:1999

Start individually:

```bash
npm run dev:next   # Next.js only
npm run dev:party  # PartyKit only
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_PARTYKIT_HOST` | `localhost:1999` | PartyKit server host. Set to your deployed URL in production |

---

## Running Tests

Tests use **Playwright** with Chromium. The Next.js dev server is auto-started by the test runner.

```bash
# Run all tests (headless)
npm test

# Interactive UI mode (opens Playwright UI)
npm run test:ui

# Open the HTML report after a run
npm run test:report
```

### Test Coverage (15 tests, all passing)

| File | Tests | What it covers |
|---|---|---|
| `tests/home.spec.ts` | 6 | Home page loads, navigation flows, validation error messages |
| `tests/solo.spec.ts` | 4 | Question loading (mocked API), answer click disables all buttons, full 10-question run, progress indicator |
| `tests/lobby.spec.ts` | 5 | Waiting room heading, room code display, host vs non-host views, Leave Room navigation |

> Multiplayer tests requiring a live PartyKit server are not included in the automated suite. Lobby tests verify correct UI rendering when the WebSocket is disconnected.

---

## Deployment

### PartyKit (WebSocket server)

```bash
npm run deploy:party
```

Deploys `party/game.ts` to Cloudflare via PartyKit. After deployment copy your PartyKit URL (e.g. `quiz-game.yourname.partykit.dev`).

### Vercel (Next.js frontend)

Push to GitHub and import the repository in Vercel. Add the environment variable:

```
NEXT_PUBLIC_PARTYKIT_HOST = quiz-game.yourname.partykit.dev
```

---

## Suggested Future Improvements

### Free libraries to add

| Library | Purpose |
|---|---|
| `framer-motion` | Richer question-card transitions and staggered list animations |
| `react-hot-toast` | Toast notifications for join/leave events and errors |
| `@radix-ui/react-dialog` | Accessible modal for "Share room code" QR code |
| `zustand` | Lightweight client state if the game grows more complex |

### Feature ideas

- **Category selection** — let the host pick a topic before starting
- **Difficulty filter** — Easy / Medium / Hard from OpenTDB
- **Custom questions** — host pastes their own JSON question set
- **Reconnect support** — preserve score when a player drops and rejoins mid-game
- **Host kick** — remove a disconnected player from the lobby
- **Sound effects** — tick, correct, wrong via Web Audio API
- **Full-screen scoreboard** — slide in between rounds
- **PWA** — add `manifest.json` so players can install on mobile

