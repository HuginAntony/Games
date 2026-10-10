# WisQuiz: future experiences

Research and concept proposal, 10 October 2026. These are future phases, not implemented game features. Classic remains simultaneous, on separate devices, with the current four-second reveal. The sound lab is a standalone audition, not integrated audio.

Scope updated 10 October 2026: all phases must run locally or within eligible free hosting tiers. No AI features, paid hosting dependencies, paid APIs, or automatic paid-tier upgrades. If a proposed feature cannot meet this boundary, defer or remove it rather than introducing a paid service.

## Product direction

Make WisQuiz the game where a group discovers how it thinks together. The signature should combine confidence, surprising group outcomes, a changing shared world, and an original musical identity. A memorable ten-minute evening matters more than a large feature catalogue.

Do not claim a world first or superiority based on this review. This is a focused examination of official product pages, not an exhaustive market or patent search. The proposed combinations are differentiation hypotheses to test with actual groups.

## What competitors already do

| Product | Evidence from its official pages | Implication for WisQuiz |
|---|---|---|
| Kahoot! | Multiple experiences including collaborative and competitive modes. | Teams and varied modes alone will not distinguish us. |
| Wayground | Score-changing power-ups, including risk/reward. | Double points are supporting features, not our central proposition. |
| Blooket | A catalogue of themed game modes. | A skin or minigame wrapped around questions is familiar territory. |
| Jackbox Survey Scramble | Six modes around survey answers; phone participation, team and audience play. | Social guessing is established. We should distinguish factual knowledge, confidence, and group storytelling. |
| CrowdParty | Custom games, mixed activities, and asynchronous hosting. | Custom packs and async challenges are useful but not new categories. |
| Mentimeter | Quiz competitions alongside polls, with avatars and leaderboards. | Live distributions and a big-screen view are expected foundations. |

Sources, accessed 10 October 2026:

- [Kahoot experiences](https://support.kahoot.com/hc/en-us/articles/35636870654867-Kahoot-experiences)
- [Wayground power-ups](https://forbusiness-help.wayground.com/support/solutions/articles/158000411014-power-ups-their-types)
- [Blooket modes](https://help.blooket.com/hc/en-us/sections/31616419667991-Game-Modes)
- [Jackbox Survey Scramble](https://www.jackboxgames.com/games/the-jackbox-survey-scramble)
- [CrowdParty custom games](https://blog.crowdparty.app/blog/crowdparty-for-teachers/)
- [CrowdParty async](https://blog.crowdparty.app/blog/how-to-host-an-async-game-on-crowdparty-step-by-step-guide-for-remote-teams/)
- [Mentimeter quizzes](https://www.mentimeter.com/quiz-presentations-3)

## First: make the game feel alive

Current code starts muted: `AppShell` and `useSound` interpret an absent preference as muted. The header only saves the preference; it does not create/resume an AudioContext or play a confirmation. Gameplay attempts playback during phase effects, outside the enabling click. Browser autoplay restrictions can therefore still prevent playback. This is a source-level diagnosis, not proof of what happened on the user's device. Existing sounds are basic synthesized tones. Tick and countdown cues exist but are not called by the current game screens.

Replace separate hook contexts with one audio engine owned by the app shell. The Enable sound gesture must resume that exact context and play a confirmation. Display Sound ready only after success; provide Test sound and volume. Preserve an explicit mute preference. On first visit, offer a small optional sound audition in the lobby instead of silently assuming users will discover the toggle. MDN recommends creating or resuming audio within a user gesture: [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

Choose an original sonic identity: warm struck-glass notes, a soft wooden lock, restrained low percussion and a four-note WisQuiz motif. The audition contains original procedural sketches rather than final mastered recordings.

| Event | Proposed sound | Timing and rule |
|---|---|---|
| Enable sound | Small rising signature | Only on explicit gesture; confirms output. |
| Answer accepted | Dry two-part wooden latch | After server acknowledgement, never before. |
| Question arrives | Airy glass accent | Once per new question, not again on reconnect. |
| Final three seconds | Quiet pulse | Optional tension channel; same for every answer. |
| Correct reveal | Bright, warm resolve | Only at the public reveal. |
| Incorrect reveal | Gentle falling pair | Encouraging, avoiding an abrasive failure buzzer. |
| Collective success | Short harmony | Once per shared milestone. |
| Finale | Four-note signature with a low foundation | Under two seconds; no long interruption. |

Effects, music, and tension need separate controls. Same-room parties should default to one nominated music device, with phones using quiet effects; remote rooms can enable individual music. Do not promise sample-perfect synchronization across phones. Use room deadlines for scheduling and drop late cues instead of stacking them. Local answer acceptance must never sound different for correct and incorrect choices before reveal.

## Signature experience 1: Confidence Table

Everyone answers the same question on their own device and privately chooses Steady or Bold before locking. Each player has three Bold tokens per match. Steady yields 100 for correct and 0 for wrong; Bold yields 180 for correct and -40 for wrong. No speed bonus in this mode; score may be negative. Never subtract an opponent's points. Skipped confidence defaults to Steady. These values are an initial playtest proposal, not a balanced final economy.

At reveal, show an anonymized confidence map: where the room was certain, where it hesitated, and which misconception caught confident players. Personal labels are opt-in. A lone correct answer receives a visual spotlight and a factual explanation; it does not gain an unpredictable extra scoring multiplier.

The distinctive opportunity is a match about knowing when you know, with a shared portrait of the room's thinking. Confidence and wagering themselves are established mechanics; the whole experience must earn its identity.

Example: everyone confidently picks Venus as the smallest planet; one Steady player picks Mercury. Reveal shows the distribution, highlights the surprise, and later records the moment as a story beat.

Implementation: mode-specific pure scoring strategy, private confidence field, server-enforced token consumption, atomic answer/confidence submission, public data only after reveal. Never precompute visible score changes. Acceptance: duplicate/replayed submissions cannot consume a token twice; every player can explain the rule after a single practice question.

## Signature experience 2: Expedition Table

The group explores an original illustrated world together: an observatory, an underwater archive, or a lost botanical city. Simultaneous answers generate shared energy; individually earned points still determine personal standings. At branch checkpoints everyone votes at once on the next destination. No player takes a turn controlling others.

Prototype one authored ten-question expedition with two branch decisions and three possible endings. Correct answers reveal landmarks, restore machines, or uncover story fragments. Missing an objective changes the ending rather than eliminating players. Do not build an open-world engine.

Different categories become tools: science restores the observatory; geography unlocks its chart; history identifies its missing visitor. Every essential clue must be available on the phone as well as the optional TV view. Story transitions get their own short intermission; they must not consume the four-second answer reveal.

Implementation: authored graph of nodes, question tags, deterministic energy rules, simultaneous branch ballots with a declared tie rule, validated state transitions, reusable local/server engine. Reconnect restores the exact node and ballot. Content creation and testing, rather than rendering, are the main effort.

## Signature experience 3: Your Night, Remembered

Produce a meaningful ending instead of only a podium: the question that fooled everybody, the confident misconception, the best recovery, and the group's strongest category. Render a compact animated highlight reel and an exportable image with a small original musical signature.

Use rules and authored sentence templates. Facts come from recorded match events. Ask before including real nicknames in an exported card. Offer an anonymous version. Export is local and manually shared; no automatic posting or account required.

Later, group-owned Chronicles can record recurring game nights on the host device, with local file export/import for backup or manual sharing. No cloud-synchronized history service is planned.

## Further ideas to explore

| Idea | Concrete experience | Priority and dependency |
|---|---|---|
| Evidence rounds | Reveal three sourced clues over time; lock whenever ready. Score by clue stage, not network-sensitive milliseconds. | Phase 3, needs authored clue packs. |
| Precision rounds | Everyone estimates a distance, date, or quantity; closest answers win under explicit tie rules. | Phase 3, needs sources, units and range validation. |
| Audio postcards | Identify an original synthesized pattern or licensed field recording; an equivalent visual question is selectable. | Phase 3, needs asset rights and accessible alternatives. |
| Constellation packs | Connect facts across a theme; the final question rewards noticing the connection. | Phase 3, editorial work and spoiler control. |
| Shared final challenge | Every player contributes privately to one multi-part solution; team diversity becomes useful. | Phase 4, prototype after Expedition. |
| Daily five | A seeded daily pack selected locally by date from bundled edited content, with a spoiler-free result card. | Phase 4; local results are casual, not a verified global ranking. No daily server job required. |
| Pack studio | Build/import/export validated question packs with explanations, sources, tags and original art. | Phase 2 foundation. |
| Room director | A deterministic selector changes the next pack segment based on aggregate room performance. | Phase 4 experiment; everyone still gets identical scored content. |
| Sound garden | Aggregate revealed outcomes add musical layers to the night's evolving soundtrack. | Phase 4 artistic experiment; music mode on one device. |
| Desktop LAN host | Run multiplayer locally with an embedded server and QR entry. | Phase 5 when demand exists; no internet multiplayer claim. |

Avoid early sabotage, pay-to-win boosters, compulsory accounts, public free-text chat, or elimination. They add friction and balancing/moderation work before the core has earned repeat play. AR, voice recognition and generated 3D worlds are research experiments, not dependencies.

## Motion direction

Use the existing tactile table aesthetic. A pressed answer sinks 2px for roughly 100ms; acknowledgement adds a quiet seal. New cards settle over 180–240ms without moving text while it is read. At reveal the correct answer is visibly marked immediately, then a thin light travels around its border for 250–350ms. Scores travel toward seats; rankings move only in a standings view. Low-frequency ambient gradients live behind the table, not behind question text.

The reveal stays four seconds from its authoritative start. Labels and correct text appear immediately; decorative animation cannot delay access to the result. Longer explanations live in the review. Multiplayer reconnects never replay celebrations or steal reading time. Reduced motion replaces movement with instant state and restrained opacity. Audio remains independently controllable.

CSS transforms/opacity and SVG handle most effects. Use a bounded Canvas layer for a finale; avoid permanent full-screen blur, hundreds of DOM particles and per-frame React updates. Establish a low-effects fallback based on performance observation and user setting. Acceptance includes text/answer bounds on 320px phones, short landscape screens, keyboard operation and reduced motion; real midrange Android and iPhone performance needs hands-on validation.

## Roadmap and decision gates

Effort below is an initial relative estimate, not a schedule. Content, physical device QA and free-tier deployment setup can dominate calendar time.

| Phase | Deliverable | Effort | Gate before expanding |
|---|---|---|---|
| 1: Signature polish | Reliable opt-in audio, six original cues, volume/music controls, acknowledgement/reveal motion, one spectator display. | Medium | Browser checks pass; hear sound on physical iPhone/Android; ten-minute phone session remains smooth; no early answer leaks; four-second dwell unchanged. |
| 2: Strategic identity | Confidence Table, factual reveal distributions, pack schema/editor, first highlight card. | Medium–large | At least five groups play twice; explain confidence correctly; compare rematch and enjoyment to Classic; verify scoring/resume/token idempotency. |
| 3: Rich rounds | Evidence, precision and original audio/visual rounds; 3 edited theme packs. | Large, content-heavy | No ambiguous accepted answers; accessible equivalents; question/source corrections possible; competitive scoring understood. |
| 4: Shared world | One Expedition, branching ballots, musical milestones, local Chronicles and bundled Daily Five trial. | Large | Non-experts remain engaged; branches work through disconnects; groups request another expedition; quota rehearsal fits free hosting limits. |
| 5: Creator tools and local reach | Offline pack editor, validated file import/export, localization and optional LAN package. | Large | Packs and histories remain local; rights and versions tracked; no hosted public library, paid API or paid hosting dependency. |

Recommended first playable expansion: Signature polish + Confidence Table + a local highlight card. This makes the new identity tangible without waiting for a narrative campaign.

Measure a baseline first: joining success, time-to-first-question, match completion, rematch choice, perceived fairness, delight and audio annoyance. Use observed comparisons, not invented improvement percentages. For prototypes, recruit mixed-experience groups and separately inspect high-latency play. Collect minimal optional research feedback; do not introduce production analytics by default.

## Architecture and free-hosting boundaries

Keep React/TypeScript and the current pure engine/PartyServer split. No renderer or backend rewrite is needed for these prototypes. Add explicit match modes and typed round variants incrementally; keep Classic migration and saved room compatibility explicit. Expand mode configuration only when the first second mode needs it, rather than creating a generic plugin framework now.

The room remains authoritative for answer/confidence locks, scoring, deadlines, ballots and source-of-truth events. Clients render motion and generate sound locally. Store compact important events at phase boundaries for recovery/reels, not frames, waveforms or musical beats. Generate default sound assets at build time or synthesize locally; ship authored content with static assets. Cap reactions and history; keep room TTLs and hibernation. Keep the 12-player room cap. A spectator display is one bounded read-only connection, not an unbounded public audience service.

[Cloudflare static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) separates static delivery from Worker execution. [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) supports SQLite-backed objects on Free with finite quotas. This permits a free path, not unlimited multiplayer. Audio, CSS and local highlights need no paid runtime service. A consolidated static frontend + room Worker is a later deployment option; retain Next.js until moving genuinely simplifies deployment.

All question packs are manually authored, reviewed and bundled or imported as validated files. The pack editor runs locally; hosts share files themselves. Scope excludes AI generation, cloud audio/video recording, hosted user uploads, a public pack marketplace, global ranking services and cloud-synchronized histories. Local highlight cards and template-based reels remain included.

Free-tier quotas remain finite. Validate room/event/storage budgets before adding online behavior; use local alternatives or reduce scope when the budget is exceeded. Never enable a paid tier automatically. An embedded LAN host is the fully local multiplayer option; internet rooms continue to need the existing free-tier coordination service. No feature depends on buying hosting.

## Concept artifacts

Open `sound-lab/index.html` in a browser for six original audio sketches and a four-second motion demo. Sound needs a click; the page starts silent. The correct answer is visible throughout the whole demo reveal, including with reduced motion. It is a single-device design audition, not a multiplayer or fairness implementation. Audio samples can also be played individually from the same folder. Prototype mastering and device-speaker listening remain open.
