import { test, expect, Browser, BrowserContext } from '@playwright/test';

/**
 * Multiplayer integration tests.
 * Requires BOTH Next.js (port 3000) AND PartyKit (port 1999) to be running.
 * Run with: npm run dev   (starts both servers)
 *
 * These tests use two browser contexts to simulate two different players.
 */

test.describe('Multiplayer lobby', () => {
  // Skip the whole suite if PartyKit isn't reachable
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    let partyKitUp = false;
    try {
      const res = await page.request.get('http://localhost:1999/', { timeout: 3000 }).catch(() => null);
      partyKitUp = res !== null;
    } catch {
      partyKitUp = false;
    }
    await ctx.close();
    if (!partyKitUp) {
      test.skip(true, 'PartyKit server not running on port 1999 — start with: npm run dev');
    }
  });

  test('host creates room, joiner sees player list, host can start game', async ({ browser }) => {
    // Use a unique code so tests don't conflict with each other
    const code = 'TST' + Date.now().toString(36).toUpperCase().slice(-3);

    // --- Host context ---
    const hostCtx = await browser.newContext();
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/lobby/${code}?name=HostPlayer&host=1`);

    // Host should connect and send join — wait to appear in player list
    await expect(hostPage.getByText('HostPlayer')).toBeVisible({ timeout: 8000 });
    await expect(hostPage.locator('[class*="hostBadge"]')).toBeVisible();

    // Start Game button should be visible (host) but disabled with only 1 player
    // (current code: disabled={players.length < 1} — 1 player IS >= 1, so it's enabled)
    const startBtn = hostPage.getByRole('button', { name: /Start Game/i });
    await expect(startBtn).toBeVisible();

    // --- Joiner context ---
    const joinCtx = await browser.newContext();
    const joinPage = await joinCtx.newPage();
    await joinPage.goto(`/lobby/${code}?name=JoinPlayer`);

    // Joiner sees themselves
    await expect(joinPage.getByText('JoinPlayer')).toBeVisible({ timeout: 8000 });
    // Joiner also sees the host
    await expect(joinPage.getByText('HostPlayer')).toBeVisible({ timeout: 5000 });
    // Joiner does NOT see a Start Game button
    await expect(joinPage.getByRole('button', { name: /Start Game/i })).not.toBeVisible();

    // Host sees joiner appear too
    await expect(hostPage.getByText('JoinPlayer')).toBeVisible({ timeout: 5000 });
    // Player count should show 2
    await expect(hostPage.getByText(/Players \(2\//i)).toBeVisible();

    // Host starts the game
    await startBtn.click();

    // Both pages should navigate to the game
    await expect(hostPage).toHaveURL(/\/game\//i, { timeout: 15000 });
    await expect(joinPage).toHaveURL(/\/game\//i, { timeout: 15000 });

    // Cleanup
    await hostCtx.close();
    await joinCtx.close();
  });

  test('second player joining sees the host immediately', async ({ browser }) => {
    const code = 'JN' + Date.now().toString(36).toUpperCase().slice(-4);

    const hostCtx = await browser.newContext();
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/lobby/${code}?name=Alice&host=1`);
    await expect(hostPage.getByText('Alice')).toBeVisible({ timeout: 8000 });

    const joinCtx = await browser.newContext();
    const joinPage = await joinCtx.newPage();
    await joinPage.goto(`/lobby/${code}?name=Bob`);

    // Bob sees Alice (the host)
    await expect(joinPage.getByText('Alice')).toBeVisible({ timeout: 8000 });
    await expect(joinPage.locator('[class*="hostBadge"]')).toBeVisible();

    await hostCtx.close();
    await joinCtx.close();
  });
});
