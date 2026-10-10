# WisQuiz usage

## Development

```powershell
cd "E:\Development\Hugin AI\Games"
pnpm install
pnpm dev
```

Open `http://localhost:3000`, host a party and share its code. Use separate browser profiles/incognito windows for independent players on one computer. Tabs in the same profile intentionally resume the same seat. A phone's `localhost` refers to the phone, not your PC; separate-device play needs a reachable room hostname. Deploying the Worker is the simplest remote-play setup.

Choose name/avatar after selecting Host/Join/Solo. Select a category from the lounge or change settings in the lobby. Guests press **I'm ready**; changing settings resets their ready states. Everyone receives identical questions/deadlines. One host can rehearse alone or invite up to 12 players.

Room links contain only the room code, such as `/lobby/ABC123`. The lounge hands nickname/avatar and initial setup to the next screen using tab-local `sessionStorage`; it is not included in shared URLs. Old `name`, `avatar`, `host` and timing/category query parameters are ignored and removed. Invite recipients enter their own nickname. Refresh still resumes the authenticated seat using the existing browser-held seat secret. Settings and host commands are validated by the Worker, not trusted because they came from browser storage. Solo setup also uses tab-local storage; the non-sensitive `offline=1` switch only selects bundled offline questions.

Keys 1–4 submit an answer outside form fields. Sending/locked-in/reconnecting states show whether the server accepted it. Accepted answers restore after refresh. A nickname alone cannot reclaim another player's seat. Hosts retain controls through short refreshes; ten seconds of absence transfers controls.

Appearance offers three themes and reduced motion. Sound starts muted. Device reduced-motion settings take precedence. Reveals default to four seconds, independent of animation duration; hosts can choose longer durations.

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

### Vercel frontend + Cloudflare multiplayer: first deployment

**Current Worker, deployed and checked 10 October 2026:** `https://wisquiz-multiplayer.huginantony.workers.dev`. `/health` passed, and a live two-player secure WebSocket test verified shared questions/deadlines, private answers and the four-second reveal default. For this deployment, set `NEXT_PUBLIC_MULTIPLAYER_HOST=wisquiz-multiplayer.huginantony.workers.dev` in Vercel, then rebuild/redeploy the frontend. The Vercel frontend configuration has not been changed by the agent.

**Windows shortcut:** double-click `Setup-Cloudflare.cmd` in the Games folder. It finds the bundled/installed pnpm (or uses Corepack), installs dependencies, opens Cloudflare login, checks and deploys the production Worker, then checks `/health`. Complete browser authorization yourself. It prints the exact Vercel environment variable and saves it in `.validation-worker/multiplayer-host.txt`; add that setting in Vercel and redeploy the frontend. The script stops on errors and never changes your plan or Vercel settings. You can rerun it after resolving an error. `Setup-Cloudflare.cmd -CheckOnly` verifies prerequisites without installing, logging in or deploying. The launcher bypasses execution policy only for its own PowerShell process; it does not change your system policy.

Deploying to Vercel alone does **not** deploy `server/worker.ts`. This release needs both the Next.js frontend and the Cloudflare room Worker. Keep Vercel for the site; the browser connects directly to the Worker for multiplayer. No Vercel rewrite or paid realtime service is needed.

1. Create/sign in to your Cloudflare account. Use the **Workers Free** plan; a purchased domain is unnecessary. The configuration already uses SQLite-backed Durable Objects, supported on Free. Enable/create your account's `workers.dev` subdomain if prompted by Cloudflare.
2. Open PowerShell in the game project. Install dependencies if necessary and run:

   ```powershell
   cd "E:\Development\Hugin AI\Games"
   pnpm install
   pnpm exec wrangler login
   pnpm deploy:check
   pnpm deploy:party
   ```

   Login opens a browser authorization flow for your own account. `deploy:check` checks the bundle without publishing. `deploy:party` publishes **wisquiz-multiplayer** and creates its configured SQLite room namespace. If prompted to select an account, select your Free account. If prompted for a paid upgrade, stop and check that the configuration uses `new_sqlite_classes`, rather than legacy KV-backed objects. Do not run `--env test` for the production deployment.

3. Copy the **actual URL printed by Wrangler**, for example `https://wisquiz-multiplayer.your-subdomain.workers.dev`. Verify the deployment:

   ```powershell
   Invoke-RestMethod 'https://wisquiz-multiplayer.your-subdomain.workers.dev/health'
   ```

   Replace the example with your printed URL. Expected fields: `status: ok` and `transport: partyserver`. A root-path 404 is normal; `/health` is the check. Health confirms the Worker endpoint, not a full multiplayer game.

4. In your **Vercel project → Settings → Environment Variables**, add:

   ```text
   NEXT_PUBLIC_MULTIPLAYER_HOST=wisquiz-multiplayer.your-subdomain.workers.dev
   ```

   Use your actual hostname, preferably without `https://` or a trailing slash. Set it for **Production**, and **Preview** if preview builds should support multiplayer. Remove old `NEXT_PUBLIC_PARTYKIT_HOST` overrides. This public hostname is not a secret; do not put Cloudflare account tokens into frontend variables.

5. **Redeploy the Vercel frontend after setting the variable**, using the updated code. Next.js embeds `NEXT_PUBLIC_*` values at build time; changing the dashboard value does not update an already-built app. If redeploying an older build, disable reuse of its build cache to ensure a fresh build. When importing the whole workspace repository, Vercel's root directory must point to `Games`.
6. Open the new Vercel deployment in two independent browser profiles/devices. Host a fresh room, join it on the other device, mark ready, and play a question. Check that both see the same question and reveal. A separate incognito window provides an independent seat; two normal tabs share one seat intentionally.

### Troubleshooting

| Symptom | Check |
|---|---|
| Multiplayer not configured | Add the public Worker hostname in the matching Vercel environment and rebuild/redeploy. |
| Host points at localhost | Remove `localhost:1999` from deployed frontend variables. It refers to each player's device. |
| Multiplayer server not responding | Visit the actual Worker's `/health`; confirm spelling, deployment success, network access and free quotas. Automatic reconnect remains active. |
| Worker health passes but room fails | Browser Network → WS should target `wss://YOUR_WORKER/parties/game/ROOMCODE?...`, not the Vercel domain or localhost. Successful upgrade uses status 101. Tail the Worker with `pnpm exec wrangler tail --env ""` for server errors. Do not post seat secrets or full message payloads in diagnostics. |
| Works in Preview but not Production | Set the variable separately for Production and deploy a fresh Production build. |
| Old hostname still used | Remove stale legacy variables, rebuild, then reload the browser. Finish old games before replacing their backend. |

References: [Next.js build-time public variables](https://nextjs.org/docs/app/guides/environment-variables), [Vercel environment variables](https://vercel.com/docs/environment-variables), [Cloudflare Free SQLite Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/).

### Hosting boundaries

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

Rollback frontend and Worker together: the join/projection protocol changed, and old clients cannot safely use the new server. Clearing original browser storage loses the seat secret. The multiplayer Worker was deployed and checked on 10 October 2026; Vercel environment configuration and frontend redeployment remain the owner's final setup step.
