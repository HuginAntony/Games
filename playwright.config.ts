import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', fullyParallel: false, workers: 1,
  retries: process.env.CI ? 1 : 0, timeout: 45000,
  reporter: [['html', { open: 'never' }], ['list']],
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1', url: 'http://127.0.0.1:3000', reuseExistingServer: !process.env.CI, timeout: 60000 },
    { command: 'node node_modules/wrangler/bin/wrangler.js dev --env test --port 1999 --ip 127.0.0.1', url: 'http://127.0.0.1:1999/health', reuseExistingServer: !process.env.CI, timeout: 60000, env: { XDG_CONFIG_HOME: path.resolve('.validation-worker/config'), WRANGLER_LOG_PATH: path.resolve('.validation-worker/logs'), WRANGLER_SEND_METRICS: 'false' } },
  ],
});
