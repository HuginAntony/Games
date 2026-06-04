# QuizBlitz — What Was Built

A real-time multiplayer trivia quiz game built with Next.js 14, PartyKit, and CSS Modules.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router, TypeScript) | React frontend + routing |
| Real-time multiplayer | PartyKit | Stateful JS class — game state lives in a `Map`, no database |
| WebSocket client | partysocket | Ships with PartyKit |
| Styling | CSS Modules + CSS custom properties | Neon dark theme, no Tailwind |
| Animations | CSS keyframes + transitions | 3D flip, glow, countdown ring |
| Winner FX | canvas-confetti | Only external UI library |
| Questions | Open Trivia Database (OpenTDB) | Free public API, no key needed |
| Deployment | Vercel (frontend) + PartyKit cloud (game server) | |

---

## Project Structure

```
quiz-game/
├── app/
│   ├── layout.tsx                  Root layout, imports globals.css
│   ├── page.tsx                    Home — mode picker, nickname, create/join room
│   ├── page.module.css
│   ├── globals.css                 CSS custom properties (neon dark theme)
│   ├── lobby/[code]/
│   │   ├── page.tsx                Waiting room — player list, share code, host Start button
│   │   └── page.module.css
│   ├── game/
│   │   ├── [code]/
│   │   │   ├── page.tsx            Multiplayer game — question card, timer, scoreboard
│   │   │   └── page.module.css
│   │   └── solo/
│   │       ├── page.tsx            Single-player game (client-only state, no PartyKit)
│   │       └── solo.module.css
│   └── results/[code]/
│       ├── page.tsx                Final leaderboard, trophy banner, confetti
│       └── page.module.css
│
├── party/
│   └── game.ts                     QuizRoom class — ALL multiplayer state (JS Map<id, Player>)
│
├── lib/
│   ├── game-engine.ts              Pure state machine functions (no side effects)
│   ├── questions.ts                OpenTDB fetch + HTML entity decoder
│   ├── scoring.ts                  calculateScore(secondsLeft) = 100 + secondsLeft×10
│   └── room-factory.ts             generateCode() — 6-char alphanumeric room code
│
├── hooks/
│   ├── usePartySocket.ts           WebSocket → React state (connects to PartyKit room)
│   └── useCountdown.ts             rAF-based 10s countdown synced to server roundStartedAt
│
├── components/
│   ├── QuestionCard/               CSS 3D rotateY flip on answer reveal
│   ├── CountdownRing/              SVG stroke-dashoffset ring (cyan → orange → red)
│   ├── Scoreboard/                 Live sorted player scores
│   ├── TrophyBanner/               Winner name + shimmer gradient + canvas-confetti burst
│   └── NeonButton/                 Reusable button (cyan / pink / ghost variants)
│
├── types/
│   └── game.ts                     All shared TypeScript interfaces and constants
│
├── styles/
│   └── globals.css                 (see app/globals.css — CSS vars live there)
│
├── partykit.json                   PartyKit project config (name + main entry)
├── vercel.json                     Vercel env var mapping
├── .env.local                      NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999 (dev)
└── package.json
```

---

## Features

### Multiplayer
- Room-code based (6-char, e.g. `ABC123`)
- Up to 8 players on different devices/browsers
- Real-time sync via WebSockets (PartyKit)
- Host creates room → shares code → players join → host starts game
- All 10 rounds run simultaneously for all players
- Scores computed server-side (anti-cheat: correct answer never sent to clients during active round)
- Auto-advance: rounds end after 10 seconds if not all players answered, or immediately when all answer

### Single Player
- Fully client-side (no server/PartyKit needed)
- Personal best saved to `localStorage` per nickname
- Same question card, countdown ring, and animations as multiplayer

### Scoring
- Formula: `100 + (secondsRemaining × 10)` per correct answer
- Maximum: 200 points per question (answer instantly)
- Minimum for correct: 100 points (answer at last second)
- Wrong or no answer: 0 points

### Animations (CSS only, no GSAP)
- **Question card 3D flip** — `rotateY(0→90→0deg)` with `perspective` + `preserve-3d` on correct answer
- **Wrong answer shake** — `@keyframes shake` horizontal translate
- **Correct answer neon glow** — `@keyframes neonPulse` green `box-shadow` burst
- **Countdown ring** — SVG `stroke-dashoffset` driven by React state, `transition: stroke-dashoffset 1s linear`, colour shifts cyan→orange→red
- **Trophy bounce** — `@keyframes trophyBounce` scale + rotate on mount
- **Winner name shimmer** — `@keyframes shimmer` moving gradient background-clip text
- **Leaderboard rows** — `@keyframes slideUp` staggered with `animation-delay`
- **Lobby player rows** — `@keyframes slideIn`
- **canvas-confetti** — burst from both sides when current player wins

---

## Game Flow

```
Home
 ├── Solo Play → /game/solo?name=...
 │     └── Questions fetched from OpenTDB (client-side)
 │           └── 10 rounds → /game/solo (results shown inline)
 └── Multiplayer
       ├── Create Room → /lobby/[code]?name=...&host=1
       │     └── Share code → friends join → host starts
       │           └── /game/[code] (all players, real-time)
       │                 └── After 10 rounds → /results/[code]
       └── Join Room → /lobby/[code]?name=...
```

---

## Design Patterns Used

| Pattern | Where | Purpose |
|---|---|---|
| State Machine | `lib/game-engine.ts` | Pure `(state, action) → newState` transitions, no side effects |
| Factory | `lib/room-factory.ts` | Encapsulates code generation |
| Observer | `hooks/usePartySocket.ts` | WebSocket events → React state |
| Strategy | `lib/scoring.ts` | Scoring formula is one swappable function |
| Repository | `party/game.ts` `QuizRoom` class | JS `Map<id, Player>` is the only data store |

---

## Security

- **No answer leaking**: `party/game.ts` strips `correctAnswer` from broadcast state while `phase === 'question'`
- **Server-side validation**: All answer submissions validated in `QuizRoom.onMessage()`, never client-side
- **Room codes**: 6-char from 32-char alphabet = ~1 billion combinations, not enumerable
- **Input sanitisation**: Nicknames trimmed and capped at 20 chars server-side

---

## Running Locally

Two terminals required:

```bash
# Terminal 1 — PartyKit dev server (game state, WebSockets)
npx partykit dev

# Terminal 2 — Next.js dev server
npx next dev
```

Open `http://localhost:3000`. Open a second tab to test multiplayer.

---

## Deploying to Production

### 1. Deploy PartyKit (game server)
```bash
npx partykit deploy
```
Note the host shown: `<your-project>.partykit.dev`

### 2. Deploy Next.js (Vercel)
1. Push the repo to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add environment variable in Vercel dashboard:
   ```
   NEXT_PUBLIC_PARTYKIT_HOST = <your-project>.partykit.dev
   ```
4. Deploy — Vercel auto-detects Next.js

### Scripts
```bash
npm run dev:next      # Next.js dev server only
npm run dev:party     # PartyKit dev server only
npm run build         # Production build
npm run deploy:party  # Deploy PartyKit to cloud
npm run type-check    # TypeScript check without building
```

---

## Dependencies

```
next             16.2.0   — framework
react            19.2.4   — UI
react-dom        19.2.4   — UI
partykit         ^0.0.x   — real-time game server CLI + runtime
partysocket      ^1.1.x   — WebSocket client
canvas-confetti  ^1.9.x   — winner confetti
@types/canvas-confetti    — TS types
typescript       dev      — strict mode
@types/react     dev
@types/node      dev
```

---

## Build Output

```
Route (app)
┌ ○ /                Static
├ ○ /game/solo       Static
├ ƒ /game/[code]     Dynamic (server-rendered on demand)
├ ƒ /lobby/[code]    Dynamic
└ ƒ /results/[code]  Dynamic
```

Build: `✓ Compiled successfully` — zero TypeScript errors, zero warnings.
