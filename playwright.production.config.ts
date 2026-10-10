import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/pwa.production.ts', workers: 1, timeout: 60000,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3001', trace: 'retain-on-failure' },
  webServer: { command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3001', url: 'http://127.0.0.1:3001', reuseExistingServer: !process.env.CI, timeout: 30000 },
});
