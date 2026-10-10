import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('two independent devices answer simultaneously, reconnect and rematch in the same room', async ({ browser }) => {
  test.setTimeout(100000);
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage(), guest = await guestContext.newPage();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'A');
  try {
    await host.goto(`/lobby/${code}?name=Host&host=1&rounds=5&revealSeconds=5`);
    await expect(host.getByRole('heading', { name: 'The party starts here.' })).toBeVisible();
    await expect(host.getByLabel('Questions', { exact: true })).toHaveValue('5');
    await guest.goto(`/lobby/${code}?name=Guest`);
    await expect(guest.getByRole('button', { name: "I'm ready" })).toBeVisible();
    await expect(host.getByRole('button', { name: 'Start game →' })).toBeDisabled();
    await guest.getByRole('button', { name: "I'm ready" }).click();
    await expect(host.getByRole('button', { name: 'Start game →' })).toBeEnabled();
    await host.getByRole('button', { name: 'Start game →' }).click();
    for (let round = 0; round < 5; round++) {
      await expect(host.getByText(`Question ${round + 1} / 5`, { exact: true })).toBeVisible();
      await expect(guest.locator('.question-title')).toHaveText(await host.locator('.question-title').innerText());
      await expect(host.locator('.answer-card').first()).toBeEnabled();
      if (round === 0) {
        fs.mkdirSync('docs/revamp/implementation', { recursive: true });
        await host.setViewportSize({ width: 1440, height: 900 });
        await guest.setViewportSize({ width: 390, height: 844 });
        await host.screenshot({ path: 'docs/revamp/implementation/live-desktop-question.png', fullPage: true });
        await guest.screenshot({ path: 'docs/revamp/implementation/live-phone-question.png', fullPage: true });
      }
      await host.locator('.answer-card').first().click();
      await expect(host.getByRole('status')).toContainText('Locked in');
      await expect(guest.locator('.answer-card').first()).toBeEnabled();
      await expect(guest.getByText('Correct', { exact: true })).toHaveCount(0);
      if (round === 0) { await host.reload(); await expect(host.getByRole('status')).toContainText('Locked in'); await expect(host.locator('.answer-card').first()).toBeDisabled(); }
      await guest.locator('.answer-card').nth(1).click();
      await expect(host.getByRole('status')).toHaveText('The answer is revealed for everyone.');
      await expect(guest.getByRole('status')).toHaveText('The answer is revealed for everyone.');
      await expect(host.locator('.correct')).toHaveCount(1);
      if (round === 0) await guest.screenshot({ path: 'docs/revamp/implementation/live-phone-reveal.png', fullPage: true });
      if (round < 4) await expect(host.getByText(`Question ${round + 2} / 5`, { exact: true })).toBeVisible({ timeout: 12000 });
    }
    await expect(host.getByRole('heading', { name: 'Final standings' })).toBeVisible({ timeout: 12000 });
    await expect(guest.getByRole('heading', { name: 'Final standings' })).toBeVisible();
    await expect(host.locator('.review-list details')).toHaveCount(5);
    await host.getByRole('button', { name: 'Play again, same party ↗' }).click();
    await expect(host.getByRole('heading', { name: 'The party starts here.' })).toBeVisible();
    await expect(guest.getByRole('heading', { name: 'The party starts here.' })).toBeVisible();
    await expect(host.locator('.room-code')).toHaveText(code);
    await expect(host.getByRole('button', { name: 'Start game →' })).toBeDisabled();
  } finally { await hostContext.close(); await guestContext.close(); }
});
