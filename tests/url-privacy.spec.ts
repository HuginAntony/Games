import { test, expect } from '@playwright/test';
import { gotoPrepared } from './prepare-entry';

test('room links expose only the code and query tampering cannot grant host controls', async ({ browser }) => {
  const hostContext = await browser.newContext(), guestContext = await browser.newContext();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'A');
  try {
    const host = await hostContext.newPage(), guest = await guestContext.newPage();
    await gotoPrepared(host, `/lobby/${code}?name=Host&host=1&rounds=5`);
    await expect(host.getByRole('button', { name: 'Start game →' })).toBeEnabled();
    await expect(host).toHaveURL(new RegExp(`/lobby/${code}$`));
    await guest.addInitScript(() => {
      const NativeSocket = window.WebSocket;
      class CapturedSocket extends NativeSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          (window as unknown as { testSocket: WebSocket }).testSocket = this;
        }
      }
      window.WebSocket = CapturedSocket;
    });
    await guest.goto(`/lobby/${code}?name=Impersonator&avatar=X&host=1&rounds=20&revealSeconds=12`);
    await expect(guest).toHaveURL(new RegExp(`/lobby/${code}$`));
    await expect(guest.getByLabel('Your nickname')).toHaveValue('');
    await guest.getByLabel('Your nickname').fill('Guest');
    await guest.getByRole('button', { name: 'Join room →' }).click();
    await expect(guest.getByRole('button', { name: "I'm ready" })).toBeVisible();
    await expect(guest.getByLabel('Questions', { exact: true })).toBeDisabled();
    await expect(guest.getByRole('button', { name: 'Start game →' })).toHaveCount(0);
    await expect(host.getByLabel('Questions', { exact: true })).toHaveValue('5');
    await guest.evaluate(() => (window as unknown as { testSocket: WebSocket }).testSocket.send(JSON.stringify({ type: 'settings', settings: { rounds: 20 } })));
    await expect(guest.locator('main [role="alert"]')).toContainText('Only the connected host');
    await expect(host.getByLabel('Questions', { exact: true })).toHaveValue('5');
    await host.reload();
    await expect(host.getByRole('button', { name: 'Start game →' })).toBeVisible();
    await expect(host.getByLabel('Questions', { exact: true })).toHaveValue('5');
  } finally { await hostContext.close(); await guestContext.close(); }
});

test('solo ignores setup supplied through the URL', async ({ page }) => {
  await page.route('**/api/questions**', route => route.abort());
  await page.goto('/game/solo?name=Forged&rounds=20&untimed=1');
  await expect(page).toHaveURL(/\/game\/solo$/);
  await expect(page.getByRole('heading', { name: "Curious player's table" })).toBeVisible();
  await expect(page.getByText('Question 1 / 10', { exact: true })).toBeVisible();
  await expect(page.getByText('Untimed', { exact: true })).toHaveCount(0);
});
