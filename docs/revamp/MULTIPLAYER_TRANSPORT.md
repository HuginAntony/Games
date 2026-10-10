# Multiplayer transport

WisQuiz uses PartyServer in a Cloudflare Worker with a SQLite-backed Durable Object per six-character room code. All devices answer the same question simultaneously. The Next.js app remains independently hostable on a free frontend tier.

## Runtime

- Development: `pnpm dev:party` (port 1999).
- Deterministic test worker: `pnpm exec wrangler dev --env test --port 1999`.
- Browser host: `NEXT_PUBLIC_MULTIPLAYER_HOST=wisquiz-multiplayer.<your-subdomain>.workers.dev` (host only, no scheme/path). Local default is `localhost:1999`.
- Worker smoke endpoint: `GET /health`.
- WebSocket endpoint: `/parties/game/ABC123`.
- Free eligibility depends on the Cloudflare account's Workers Free plan and SQLite Durable Objects quotas. This change does not enroll an account, add a payment method, or deploy a cloud resource. Do not claim unlimited capacity.

Cloudflare configuration is in `wrangler.jsonc`; the `v1` migration uses `new_sqlite_classes`. This is a fresh Worker migration, not an in-place conversion of old PartyKit storage. Persisted old rooms are not copied. Hibernation and Durable Object alarms avoid idle JavaScript timers. Room state, question decks, per-player responses, credential hashes and absolute phase deadlines persist in SQLite-backed storage. Every phase transition is saved before publishing.

## Identity and messages

`usePartySocket(roomCode)` returns `gameState`, `connected`, `error`, `myId`, `ownAnswer`, `pendingAnswer`, and `send`.

The hook creates a random 256-bit browser credential, stores it with the room profile in localStorage, and sends it only inside the WebSocket join message. It is never placed in a URL, public state or console log. The Worker stores its SHA-256 hash and assigns a separate stable random player ID. Reconnection and reload preserve the seat; a matching nickname never authenticates a seat. Multiple tabs on the same origin/room share a seat. Clearing browser storage loses seat recovery. HTTPS/WSS is required for deployment.

Client messages:

```ts
{ type: 'join', nickname, avatar, create: true } // explicit new host
{ type: 'join', nickname, avatar, create: false } // guest, errors for missing room
{ type: 'settings', settings: { rounds: 10, category: 'mixed', difficulty: 'mixed', questionSeconds: 15, revealSeconds: 8 } }
{ type: 'ready', ready: true }
{ type: 'start' }
{ type: 'answer', answerIndex: 0 } // hook adds current questionIndex
{ type: 'rematch' }
{ type: 'leave' }
```

The hook injects `session` into join. Reconnect auto-sends the saved profile; UI join commands may be idempotently repeated. Only the authenticated host can change settings, start or rematch. Every connected non-host player must be ready before starting. Settings changes reset those ready flags. A serialized command queue and persisted `starting` flag prevent concurrent starts. Malformed, oversized, invalid-index, wrong-round, after-deadline and unknown commands are rejected; per-connection bursts above 20 commands per second are rejected.

Server messages:

```ts
{ type: 'state-update', room: PublicGameRoom, selfId, ownAnswer }
{ type: 'answer-accepted', answerIndex, questionIndex }
{ type: 'error', message }
```

Answer acceptance is acknowledged after persistence. `pendingAnswer` is cleared on acknowledgement, error or disconnect. An already accepted answer is immutable. Public players expose `answered` so others see participation, while `answeredIndex` remains null until reveal. The room omits the private question deck and answer timestamps. Scores, correct counts and streaks are computed only at reveal, preventing a points-based correctness leak. Only the submitting seat receives its private `ownAnswer` before reveal. The question's correct index appears only in `round-result` or `final-result`.

## Game settings and lifecycle

Rounds: 5/10/15/20. Categories: mixed/science/history/geography/entertainment/sports. Difficulty: mixed/easy/medium/hard. Question seconds: 10/15/20/30. Reveal seconds: 5/8/12. Defaults: 10 rounds, mixed category/difficulty, 15-second question, 8-second reveal.

Phases: lobby → 3-second countdown → question → round-result → next question → final-result. All connected players answering can end a question early. Disconnected players retain their seat and score but do not block early reveal. Leaving removes a seat. A disconnected host gets a persisted ten-second grace period for refresh/reconnection; after that, an alarm transfers host controls to the first connected player. Returning after succession does not take the host role back. Rematch retains the room, connected seats and settings, returns to the lobby and resets ready states; scores reset at next start.

`phaseEndsAt` is the authoritative deadline. Alarms wake the Durable Object at deadlines. A late alarm advances one phase from current server time so users still receive the full answer/reveal interval. Six hours without persisted activity expire the room and credentials.

Scoring: 100 base points plus 10 per whole second remaining, with bonus capped at 100; wrong/missed answers score zero. Correct answers increment accuracy/streak statistics at reveal.

## Questions and fallback

Open Trivia DB requests are limited to six seconds and validated for a complete four-choice deck with unique answers. On outage/rate limits/invalid responses, a bundled original 100-question deck supplies 20 unique questions per category. The `questionSource` field identifies `opentdb` or `curated`. Curated questions preserve category, but may mix difficulty if the requested level has too few unique questions. UI must label this limitation. `QUIZ_QUESTION_SOURCE=curated` forces deterministic offline-provider operation on the Worker; the test environment sets it automatically. The Next.js questions API uses the same environment variable.

Offline solo can call `getCuratedQuestions(settings)` directly; no server is needed. This is separate from internet multiplayer coordination.

## Validation

- `pnpm test:engine` runs pure rules/provider tests.
- With a local test Worker running: PowerShell `$env:QUIZ_TEST_HOST='127.0.0.1:1999'; pnpm exec tsx --test tests/transport.test.ts` verifies 12 seats, privacy, resume, deadlines and full rematch over real WebSockets.
- PowerShell `$env:QUIZ_TEST_RESTART='1'; pnpm exec tsx --test tests/restart.test.ts` starts and restarts an isolated Worker on port 2001 to verify persisted seat, accepted answer and alarm deadline recovery.
- `pnpm exec wrangler deploy --env test --dry-run` validates the Worker bundle without deployment.

For sandboxed development, redirect `XDG_CONFIG_HOME` and `WRANGLER_LOG_PATH` into a writable workspace folder. A network sandbox may require approved local-process execution for localhost sockets. Ignore `.validation-worker/` and `.wrangler/` generated directories.

References: [PartyServer migration](https://docs.partykit.io/guides/migrate-to-partyserver/), [Cloudflare Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).
