# WisQuiz: the party-table revamp

Prepared 9 October 2026. Implementation approved and delivered locally. Internet multiplayer remains simultaneous on separate devices. Pass-and-play is deferred to a separate version; see implementation/VALIDATION.md for delivered scope and validation. Cloud deployment is a separate setup step.

## Recommendation

Turn WisQuiz into a polished trivia party experience: a welcoming lounge, a tactile question table, satisfying answer reveals and an easy rematch. Borrow Flip7's material quality, player visibility, themes, sound preferences and deliberate reveal pacing. Keep trivia's simultaneous answers; copying Flip7's turn structure would slow online quizzes unnecessarily.

Use React and TypeScript for the interface and shared rules. Initially retain Next.js to avoid mixing a framework rewrite with urgent multiplayer migration. Replace hosted PartyKit with PartyServer on SQLite-backed Cloudflare Durable Objects, deployed directly with Wrangler. Add an in-app local engine for solo. Shared-device pass-and-play is deferred to a separate version. After that works, evaluate moving the frontend to Vite and Cloudflare static assets for a single deployment.

## What exists today

Source inspected: `app/page.tsx`, `app/game/[code]/page.tsx`, `party/game.ts`, `lib/game-engine.ts`, `types/game.ts`, `hooks/usePartySocket.ts`, `hooks/useCountdown.ts`, deployment configuration and Playwright tests. Flip7 references: implemented rectangular themes, screenshot, settings/reveal architecture and implementation notes.

- The repository README calls it QuizBlitz; the actual home screen calls it WisQuiz. Keep **WisQuiz** and unify documentation/metadata later.
- Next.js 16.2, React 19.2, TypeScript, CSS modules, procedural audio, confetti and QR sharing are already present. A new renderer is not required to make this beautiful.
- Online rooms support 12 players, OpenTDB questions, server timestamps, answer reveals and final rankings. Solo is a separate client flow.
- A pure-function engine is a useful starting point, although `Date.now()` inside rules should become an explicit input for deterministic tests.
- Rejoin uses nickname matching and swaps socket IDs. A nickname is not proof of player identity; another connection can claim a seat and its host authority.
- Public state includes each player's answer index and updated score during the question. Even with `correctIndex` removed, a score increase exposes correctness and players can follow another player's answer. Reveal answer choices and score changes only after the answer window closes; publish only locked-in status before then.
- `submitAnswer` checks phase, but lacks an explicit deadline and answer-index range guard. A late correct answer can still earn base points until the timer callback changes phase.
- Start loads questions asynchronously while the room remains in lobby. Reserve a loading phase immediately, enforce one start operation and guard room revision/host changes after await.
- `startGame` does not align `totalRounds` with fetched questions; start messages can request a variable count. Validate allowed settings, require an adequate deck and derive progress from the accepted deck.
- Room state is process memory; timers are local `setTimeout`s. Persist state and absolute deadlines for reliable recovery.
- Active disconnects do not remove players or track presence; `allAnswered` can wait for disconnected seats. Add a presence/grace policy and host succession.
- A submitted answer is optimistically locked in the client without an explicit acknowledgement. Distinguish sending, accepted, rejected and reconnecting states.
- There is multiplayer test source, but the suite skips if PartyKit is unavailable and the Playwright config auto-starts only Next.js. Make real multiplayer checks required in CI with both services running.
- Existing README mixes historical fixes and current behavior. Replace with a current architecture/setup guide and keep history separately.

These are source-based findings, not claims that the live deployment was tested. Existing ZIP deletion and PartyKit local-state changes in Git were left untouched.

## Hosting decision: preserve a free option

**Urgent:** PartyKit's official notice says the hosted platform is shutting down and `partykit deploy` stops working on **23 October 2026**. `vercel.json` currently points at `quiz-game.huginantony.partykit.dev`. Source confirms configured dependence; account status and live availability were not checked.

| Option | What runs where | Free fit | Decision |
|---|---|---|---|
| Retain Next.js/Vercel; move room server to Cloudflare | Existing frontend plus PartyServer Durable Objects | Vercel Hobby is for personal, non-commercial use; Cloudflare free quotas apply | First migration: lowest disruption |
| React/Vite + Cloudflare assets + PartyServer | Static UI and room endpoints in one Worker project; each room is a Durable Object | Static asset requests are free/unlimited; Worker/room work has free quotas | Preferred eventual consolidated deployment |
| Solo and shared-device local engine | Rules and packaged questions run in the browser/PWA | No multiplayer hosting required | Include in the first redesigned release |
| Desktop app with embedded LAN server | Packaged app serves UI and rooms over the local network | No cloud backend cost; host device must remain awake | Optional follow-up after desktop demand is confirmed |
| WebRTC peer-hosted internet rooms | Host browser plus signalling; TURN may be needed | Reliable remote connectivity cannot be promised at zero cost | Do not make this the primary online mode |
| .NET/SignalR server | Native or hosted ASP.NET service | Excellent for an embedded Windows LAN host; internet deployment still needs a host | Consider only for the desktop/LAN milestone |

Cloudflare's current documentation permits **SQLite-backed** Durable Objects on Workers Free; legacy KV-backed namespaces require Paid. Use a new SQLite namespace if needed. Do not assume PartyKit's migration guide alone converts old storage to a free-compatible backend. Avoid migrating running games; finish/drain rooms and start fresh under the new endpoint.

Verified limits: Durable Objects 100,000 requests/day and 13,000 GB-s/day; SQLite storage 5 million rows read/day, 100,000 rows written/day and 5 GB total. Worker ingress has separate quotas. Free limits are finite; exceeded operations fail. Stay on Free unless the owner deliberately elects to upgrade. No account creation, provisioning or deployment is part of this proposal.

Cost design: no per-second timer broadcasts, no polling lobby, bounded reactions, small state snapshots, WebSocket hibernation and durable alarms, idle room expiry, bundled assets and questions, no mandatory database service or paid AI dependency. Measure actual Worker requests, room duration, writes and connection behavior in a test deployment before estimating capacity. Example load rehearsal: 20 simultaneous rooms × 12 players × 10 questions, plus reconnect bursts; it is a test target, not a promised free capacity.

“Runs as part of the app” has two useful meanings: local shared-device multiplayer can truly live in the app; remote online multiplayer can share one deployment with the frontend but still needs server-side coordination. An ordinary browser/PWA cannot listen as a general LAN WebSocket server. A native desktop host can, but Wi-Fi isolation, firewall consent and HTTPS/mobile browser behavior need a dedicated prototype.

## Product direction

**Positioning:** quick trivia nights with the feel of a premium tabletop party game. No account required to play. Typical match: 5–10 minutes, 2–12 online players, 1 solo player or 2–6 local players in the initial shared-device release.

**Identity:** WisQuiz by Wisdom Evolution. Keep the lightning motif as a small mark; give most visual space to the question, answer cards and friends. A warm display serif can headline the lounge; questions and answer text use a highly readable sans serif.

**Recommended default — Midnight Social:** graphite table, champagne rails, ivory text, violet/teal category colours and restrained atmospheric light. Adapt Flip7's Obsidian Luxe quality to a brighter, playful quiz.

**Alternative — Prism Lounge:** deep blue with violet light and iridescent card edges; more energetic and suited to party nights.

**Alternative — Neon Studio:** ink/navy with crisp cyan and coral accents; strongest arcade identity. Use luminous accents around controls rather than glowing every text label.

Themes change tokens/materials; all use identical information hierarchy, contrast requirements and layouts. Avoid gambling/casino imagery. Reuse useful Flip7 patterns; inspect provenance before reusing any artwork or code.

## Screens and interactions

1. **Party lounge / home.** Lead with “Good company. Great questions.” Show Host a party and Join with code. Secondary Solo practice and Pass & play. Ask for name/avatar when needed rather than presenting a large form first. Include last-used settings, concise mode descriptions and theme/sound controls.
2. **Setup and lobby.** One card for rounds (5/10/15/20), time (10/15/20/30 seconds), categories, difficulty and Classic/Confidence rules. Large code plus copy/share/QR, participant tiles, host badge and ready/presence states. Announce joining/leaving accessibly. Start once deck is prepared and accepted settings are visible to everyone. Guests cannot silently change rules.
3. **Live table.** Question occupies the centre, four tactile answer cards below, personal score/status clearly labeled, progress and timer together. Desktop adds player seats/compact standings; phone uses two-column or stacked answers depending on content length, with standings behind a sheet. A 12-seat roster must never squeeze questions into unreadability.
4. **Answer committed.** Card settles into a “Sending…” then “Locked in” state with server acknowledgement. Others expose only answered/thinking/disconnected. Reconnect disables submission until state and deadline are reconciled. Keep the chosen answer visible.
5. **Reveal and standings.** Flip/reveal the correct card, keep question and chosen answer readable, show base/time/bonus breakdown and rank movement. Minimum five-second reveal is independent of animation duration, including reduced motion. A longer read mode can be selected before play. No explanation text unless supplied by a curated pack; do not fabricate facts from OpenTDB.
6. **Final celebration.** Compact podium, full rankings, accuracy, longest streak and personal summary. Rematch reuses the party, changes the deck and rotates question history. Everyone sees host/waiting status. Offer review of missed questions and return to lounge.
7. **Local handoff.** Name the next player, cover previous choices, require “I'm ready” before showing the question. Use distinct questions of the same difficulty per player; shared-device play must not pretend sequential answers to the same exposed question are simultaneous/fair. Explain this mode's rules in setup.
8. **Recovery.** Explicit reconnect banner, unavailable/expired/full room states, host replacement, exhausted free service message, provider failure fallback and offline mode invitation. Never silently convert an ongoing online room into a solo match.

The companion `mocks/index.html` provides five linked screens, answer submission/reveal, local handoff, theme selection and a phone-width preview. It uses synthetic state and an illustrative question; it is not a functional multiplayer implementation. The generated concept board is an aspirational material/layout reference; implementation must follow measured responsive layouts rather than fixed image perspective.

## Game improvements and rules

### First redesigned release

- **Classic** stays the default: correctness first, bounded time bonus. Display the formula and derive duration/scoring from room settings. Preserve the existing 100 base + 10 per whole second rule for the 10-second preset; for longer presets cap the speed component at 100 to avoid duration inflating scores. Introduce a versioned scoring rule to prevent mixed clients.
- Category/difficulty filters, round/time presets and read-friendly reveal duration.
- Curated original/licensed starter packs for offline and provider failure, with question IDs, source/licence, difficulty, checked answers and optional reviewed explanations.
- Reliable rematch, no repeated question IDs within a session where the pack is large enough, explicit short-pack handling.
- Solo practice with an optional untimed mode, local progress and missed-question review. Online timer settings apply equally to all players.
- Pass-and-play uses a local controller, covered handoffs and per-player equivalent decks; speed scoring disabled by default because device handoff varies.
- Lightweight muteable sounds, keyboard answers 1–4, visible focus, captions/status text, persistent theme/motion settings.

### Optional second release

- **Confidence mode:** one “Double down” token per match, committed atomically with the answer. Correct doubles that question's awarded points; wrong earns zero and consumes the token. Token state remains private until reveal. Separate leaderboard/rules from Classic; no retroactive use.
- Team mode with an explicit captain answer or an agreed voting rule; define ties and connected-member policy before building.
- TV/spectator layout with no submission rights and answers hidden until reveal.
- Bounded reaction bursts, category drafting, streak badges and reviewed themed question packs.
- Desktop LAN host and Android packaging only after the PWA and transport boundary are proven.

Avoid power-ups that hide content, interfere with screen readers, or unfairly punish slower connections. No paid service is needed for core play. AI question authoring, if added later, is an optional offline editorial workflow with human fact checking.

## Technical architecture

`domain/`: serializable room state, commands, validated settings, scoring and transitions. Input includes trusted server time, deck and randomness; no React, network, `Date.now()` or timers in rules.

`application/`: room controller, state projection, acknowledgements, phase scheduling, revision checks and adapters. Define `create`, `join`, `resume`, `ready`, `start`, `answer`, `rematch`, `leave` and `getSnapshot`.

`transports/`: online PartyServer adapter; in-process local adapter for solo/pass-and-play; optional native LAN adapter later. Shared command/event schema, version and error codes. Do not add an elaborate plugin framework.

`questions/`: curated bundled pack and server-side OpenTDB provider. Bounded fetch/retry, cancellation, decoding and validation, duplicate IDs, request limits and fallback. Prepare a deck once per match. Online correct answers stay server-side; local/offline pack answers are inspectable by a determined local user, which is acceptable for practice/shared-device casual play and never treated as ranked online authority.

`ui/`: accessible React DOM/CSS table, reusable question/answer/player/reveal components, tokenized themes, preference store and synthesized Web Audio. CSS transforms and limited decorative canvas produce 2.5D depth. Phaser/Three.js would add complexity to text-heavy responsive UI without a demonstrated need.

`server/`: one SQLite-backed Durable Object per room; room snapshot, active deadline and minimal command deduplication persisted atomically. Durable alarms recover countdown/reveal transitions after eviction; reconcile deadlines on messages/connect too. WebSocket hibernation, expiring seats/rooms and host succession. Reconnecting players receive a state revision plus accepted own answer. Server-created opaque resume secrets prove seat ownership; nickname is display only. Hash stored secrets, scope to room/seat and expire them; never place them in public state or URLs.

Projection rules: private deck and answer keys never sent early; per-player answer/ack is unicast; pre-reveal public state contains only answer status and last completed-round score. After reveal, publish choices, correct index and score deltas. Validate message schema, size, command IDs, room/round revision, allowed index, deadline, seat authority and duplicate submission before changing state. Rate-limit create/join/start/reactions.

Frontend migration decision: keep Next.js through the multiplayer spike. If there is no meaningful SSR requirement, port route shells/components to Vite, replace `/api/questions` with Worker API/local provider and serve assets plus room routes from one Worker. Verify deep links, QR links, SPA fallbacks and PWA updates. If this costs disproportionate work, keep Next.js/Vercel with the new free room backend; the visual redesign does not depend on Vite.

## Delivery phases and gates

| Phase | Work and artifacts | Acceptance gate | Approximate effort |
|---|---|---|---|
| 0 — Direction | Review mocks, approve preferred theme/modes and release scope | Approved plan and selected direction | 0.5–1 day |
| 1 — Hosting continuity | PartyServer/Wrangler spike on SQLite Free; preserve existing Next frontend; endpoint config; room recovery/identity/projection fixes | Two real clients complete a match and resume a seat; actual Free deployment validated | 2–4 days |
| 2 — Shared rules | Deterministic engine, settings, provider fallback, acknowledgement/revision protocol, unit tests | Late/duplicate/invalid commands rejected; no correctness leak; deck/settings consistent | 2–3 days |
| 3 — First visual slice | Lounge → lobby → question → reveal → results in recommended theme | Complete 2-player flow with responsive/keyboard/reduced-motion checks | 3–5 days |
| 4 — Local play + content | Solo/local adapters, curated pack, handoff, progress and missed answers | Offline session works; local hands/results and fairness rules are clear | 2–4 days |
| 5 — Release hardening | 12 players, interruptions, host departure, rematch, asset/performance QA; README and USAGE | Required online tests run without silent skips; hosting quotas observed; rollback documented | 2–3 days |
| 6 — Optional consolidation | Vite/static assets and one Cloudflare deployment | No broken deep links or service-worker stale protocol; free setup proven | 1–3 days |

Estimate: about 12–22 focused development days plus optional consolidation. Reassess after the hosting spike. Since 23 October is near, approve and deliver the small hosting-continuity slice before waiting for the complete visual release. No upgrade to a paid tier is assumed.

## Verification and release criteria

- Deterministic unit tests: scoring, deadline equality policy, invalid indices/settings, all phase transitions, deck shortage, duplicate commands, private/public projections, rematch and token rules if enabled.
- Multiplayer integration: two isolated browser contexts complete every phase; also 12 clients, simultaneous start, refresh in each phase, duplicate nicknames without identity collision, stolen nickname cannot resume, disconnect grace and host succession.
- Recovery: evict/restart the room between question/reveal, resume accepted answer, ensure alarms advance once, reject stale round commands and reconcile background-tab clocks.
- Content/provider: slow/failing OpenTDB, malformed/encoded content, not enough questions, duplicate pack IDs, curated fallback and no unreviewed explanation text.
- Visual: actual answer/control bounds at 320×568, 390×844, 844×390, 768×1024 and 1440×900; test long questions/answers/names, 12 participants and 200% text zoom. Scroll when needed; never hide or overlap controls to force a single screen.
- Accessibility: focus order, labeled status and cards, contrast, timer announcement cadence, keyboard selection, motion preference and colour-independent result indicators. Reduced motion keeps the full reveal reading interval.
- Performance targets: responsive input on a mid-range phone, decorative motion typically 60 fps, bounded particles and no timer-driven rerenders of the whole roster. Measure bundle/load under mobile throttling; initial target <250 KB gzip app JavaScript excluding optional loaded effects, to be confirmed against the retained framework.
- Hosting: verify actual Free account/storage backend, monitor ingress/duration/storage separately, idle-room expiry and controlled quota-exhaustion behavior. No per-second network clock updates.
- Documentation: current README, USAGE with local/offline/dev/deploy examples, hosting assumptions, rules, protocol version, asset/content provenance, test evidence and known limits. Ship independently reviewable commits and retain a rollback frontend/backend pair.

## Sources checked on 9 October 2026

- [PartyKit hosting retirement notice](https://docs.partykit.io/guides/deploy-to-cloudflare/)
- [Official migration to PartyServer](https://docs.partykit.io/guides/migrate-to-partyserver/)
- [PartyServer source and API](https://github.com/cloudflare/partykit/tree/main/packages/partyserver)
- [Durable Objects pricing and free storage requirements](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Cloudflare static assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Vercel Hobby scope](https://vercel.com/docs/plans/hobby)
- [Vercel WebSocket guidance](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections)

Approved implementation scope: Midnight Social plus Prism Lounge and Neon Studio themes; simultaneous Classic multiplayer and solo practice; PartyServer with Cloudflare SQLite free-tier configuration. Pass-and-play, Confidence, teams, native LAN hosting and Vite consolidation remain future milestones. Historical proposed options above are not all first-release deliverables.

## Artifact validation

Generated material/layout concept visually inspected. Clickable mock passed JavaScript syntax, unique HTML ID, navigation-target and script-target checks. In-app browser blocks file URLs, so actual viewport geometry and interaction have not been browser-verified; no workaround was attempted. No existing application tests were run because application code is unchanged. See `mocks/VALIDATION.json`.
