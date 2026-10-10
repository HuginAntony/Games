// The multiplayer entry point has migrated to server/worker.ts.
// Run wrangler dev --port 1999 or wrangler deploy using wrangler.jsonc.
export { Game, default } from '../server/worker';
