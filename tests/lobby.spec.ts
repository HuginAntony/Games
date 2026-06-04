import { test, expect } from '@playwright/test';

/**
 * Lobby / multiplayer smoke tests.
 * These only test the UI without a real PartyKit server (WebSocket connections
 * fail gracefully — the page should still render correctly).
 */

test.describe('Lobby page (no PartyKit server)', () => {
  test('shows Waiting Room heading and room code', async ({ page }) => {
    await page.goto('/lobby/TEST12?name=Host&host=1');
    await expect(page.getByText(/Waiting Room/i)).toBeVisible();
    // Room code should be displayed
    await expect(page.getByText('TEST12')).toBeVisible();
  });

  test('shows Connecting... while socket is not connected', async ({ page }) => {
    await page.goto('/lobby/TEST12?name=Host&host=1');
    // When no PartyKit server is running, the page shows "Connecting..."
    await expect(page.getByText(/Connecting\.\.\./i)).toBeVisible({ timeout: 5_000 });
  });

  test('host sees Start Game button', async ({ page }) => {
    await page.goto('/lobby/TEST12?name=Host&host=1');
    await expect(page.getByRole('button', { name: /Start Game/i })).toBeVisible();
  });

  test('non-host does NOT see Start Game button', async ({ page }) => {
    await page.goto('/lobby/TEST12?name=Player');
    await expect(page.getByRole('button', { name: /Start Game/i })).not.toBeVisible();
    await expect(page.getByText(/Waiting for the host/i)).toBeVisible();
  });

  test('Leave Room button navigates home', async ({ page }) => {
    await page.goto('/lobby/TEST12?name=Host&host=1');
    await page.getByRole('button', { name: /Leave Room/i }).click();
    await expect(page).toHaveURL('/');
  });
});
