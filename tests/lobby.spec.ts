import { test, expect } from '@playwright/test';
test('missing room gives an actionable error instead of creating a new party', async ({ page }) => {
  await page.goto('/lobby/MISS' + Math.random().toString(36).slice(2, 4).toUpperCase());
  await page.getByLabel('Your nickname').fill('Guest');
  await page.getByRole('button', { name: 'Join room →' }).click();
  await expect(page.locator('main [role=alert]')).toContainText('Party not found');
  await expect(page.getByRole('button', { name: 'Start game →' })).toHaveCount(0);
});
