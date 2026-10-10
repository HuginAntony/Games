# WisQuiz usage

## Development

```powershell
cd "E:\Development\Hugin AI\Games"
pnpm install
pnpm dev
```

Open `http://localhost:3000`, host a party and share its code. Use separate browser profiles/incognito windows for independent players on one computer. Tabs in the same profile intentionally resume the same seat. A phone's `localhost` refers to the phone, not your PC; separate-device play needs a reachable room hostname. Deploying the Worker is the simplest remote-play setup.

Choose name/avatar after selecting Host/Join/Solo. Select a category from the lounge or change settings in the lobby. Guests press **I'm ready**; changing settings resets their ready states. Everyone receives identical questions/deadlines. One host can rehearse alone or invite up to 12 players.

Keys 1–4 submit an answer outside form fields. Sending/locked-in/reconnecting states show whether the server accepted it. Accepted answers restore after refresh. A nickname alone cannot reclaim another player's seat. Hosts retain controls through short refreshes; ten seconds of absence transfers controls.

Appearance offers three themes and reduced motion. Sound starts muted. Device reduced-motion settings take precedence. Every reveal allows at least five seconds to read, independent of animation duration.

## Solo / offline

Solo practice uses selected settings. **Play starter pack offline** starts local questions immediately. Untimed mode gives 100 per correct answer; timed mode uses online scoring. Bests are separated by nickname, category, difficulty, length and timer/mode.

For offline loading, first visit the production site online and wait for shell caching. Then use the starter-pack link. A first-ever offline visit cannot download an app. Local packs preserve category but may broaden difficulty to supply enough unique questions. Internet multiplayer requires connectivity.

```powershell
pnpm build
pnpm start
```

Visit localhost online, switch offline, then use the starter-pack link. Service workers register only in production on HTTPS/localhost. Rooms and question API responses are not cached. Updates use the normal service-worker lifecycle; active games are not forcibly reloaded.

## Tests

```powershell
pnpm type-check
pnpm test:engine
pnpm exec playwright install chromium
pnpm test
pnpm build
pnpm test:pwa
```

Browser tests start Next.js plus a test Wrangler Worker using `QUIZ_QUESTION_SOURCE=curated`. Real browser contexts test multiplayer. A clearly labeled synthetic 12-seat fixture is used only for layout stress. Existing local services may be reused outside CI; the reused Worker must run the **test** environment for deterministic questions.

Optional actual 12-WebSocket / host-succession test:

```powershell
# Terminal 1
pnpm exec wrangler dev --env test --port 1999
# Terminal 2
$env:QUIZ_TEST_HOST='127.0.0.1:1999'
pnpm test:transport
```

Optional isolated persistence/restart rehearsal, using its own Worker on port 2001:

```powershell
$env:QUIZ_TEST_RESTART='1'
pnpm test:restart
```

These explicit opt-in tests skip without their environment variables. The main browser multiplayer test is mandatory and does not skip. Keep port 2001 free for restart rehearsals.

## Free online deployment

The frontend and room Worker are separate deployable parts in this release. Cloudflare Workers Free supports SQLite-backed Durable Objects. Use a Free account and verify quotas; Vercel Hobby is limited to personal/non-commercial use. Official sources are linked in the README.

```powershell
# Sign in to your own account, then inspect the bundle before publishing.
pnpm exec wrangler login
pnpm deploy:check
pnpm deploy:party
```

`deploy:check` is a dry run; `deploy:party` creates/updates the Worker and SQLite namespace. Review account/Free eligibility first. The default workers.dev hostname avoids requiring a purchased domain.

Set in the frontend hosting dashboard before building/deploying:

```text
NEXT_PUBLIC_MULTIPLAYER_HOST=wisquiz-multiplayer.YOUR_SUBDOMAIN.workers.dev
```

Use only a hostname: no `https://`, trailing slash or route. Remove stale `NEXT_PUBLIC_PARTYKIT_HOST` overrides. Push/import the Next.js project into an eligible frontend host and test two independent browser/device sessions on the deployed URL. Finish old PartyKit games; this migration starts fresh rooms rather than transferring its hosted namespace.

Free quotas are finite. Current Durable Objects documentation lists 100,000 requests/day, 13,000 GB-s/day, 5 million SQLite rows read/day, 100,000 rows written/day and 5 GB total storage. Worker ingress has separate quotas. Excess operations fail; the app never automatically upgrades your plan. Measure real traffic in the provider dashboard. No per-second timer broadcast is used; rooms hibernate and expire after six hours without persisted activity.

## Scope / rollback

Delivered: simultaneous Classic multiplayer, solo, three themes, recovery, settings, score/accuracy/streak summaries, QR/link sharing, same-party rematch and offline starter play. Pass-and-play, Confidence/Double down, teams, TV/spectators, desktop LAN hosting and Vite/single-deployment consolidation are future milestones.

Rollback frontend and Worker together: the join/projection protocol changed, and old clients cannot safely use the new server. Clearing original browser storage loses the seat secret. No cloud deployment occurred during local implementation.
