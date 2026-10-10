import { gotoPrepared } from './prepare-entry';
import { test, expect } from '@playwright/test';

test('a configured backend connects independent players and delivers a shared question', async ({ browser }) => {
  const hostContext = await browser.newContext(), guestContext = await browser.newContext();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'A');
  try {
    const host = await hostContext.newPage(), guest = await guestContext.newPage();
    await gotoPrepared(host, `/lobby/${code}?name=Host&host=1&rounds=5`);
    await expect(host.getByRole('button', { name: 'Start game →' })).toBeEnabled();
    await gotoPrepared(guest, `/lobby/${code}?name=Guest`);
    await guest.getByRole('button', { name: "I'm ready" }).click();
    await host.getByRole('button', { name: 'Start game →' }).click();
    await expect(host.locator('.question-title')).toBeVisible({ timeout: 15000 });
    await expect(guest.locator('.question-title')).toHaveText(await host.locator('.question-title').innerText());
    await expect(host.locator('.answer-card').first()).toBeEnabled();
    await expect(guest.locator('.answer-card').first()).toBeEnabled();
  } finally { await hostContext.close(); await guestContext.close(); }
});

test('an unreachable multiplayer server reports a useful error and keeps solo available', async ({ page }) => {
  // An isolated transport stub avoids disrupting the real multiplayer test Worker.
  await page.addInitScript(() => {
    class UnreachableSocket extends EventTarget {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
      readyState = 0;
      constructor(..._args: unknown[]) { super(); }
      close() { this.readyState = 3; }
      send() {}
    }
    Object.defineProperty(window, 'WebSocket', { value: UnreachableSocket });
  });
  await gotoPrepared(page, '/lobby/ABC123?name=Tester&host=1');
  await expect(page.getByRole('heading', { name: 'Finding your table…' })).toBeVisible();
  await expect(page.locator('main [role="alert"]')).toContainText('multiplayer server is not responding', { timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Your table could not connect.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Play solo instead', exact: true })).toBeVisible();
});

test('a deployed frontend without an endpoint reports configuration instead of dialing localhost', async ({ page, baseURL }) => {
  let attemptedSockets = 0;
  page.on('websocket', () => attemptedSockets++);
  // Serve the local app under a synthetic remote origin; no public site is contacted.
  await page.route('https://wisquiz.example/**', async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${baseURL}${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  await gotoPrepared(page, 'https://wisquiz.example/lobby/ABC123?name=Tester&host=1');
  await expect(page.locator('main [role="alert"]')).toContainText('Multiplayer is not configured');
  await expect(page.getByRole('heading', { name: 'Your table could not connect.' })).toBeVisible();
  expect(attemptedSockets).toBe(0);
});
