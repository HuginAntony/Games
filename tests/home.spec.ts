import { test, expect } from '@playwright/test';
test('lounge preserves simultaneous multiplayer and validates join', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Good company. Great questions.' })).toBeVisible();
  await expect(page.getByText('No waiting for turns', { exact: false })).toBeVisible();
  await expect(page.getByText('Pass & play', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Join with code' }).click();
  await page.getByRole('button', { name: 'Join room →' }).click();
  await expect(page.locator('main [role=alert]')).toContainText('Enter a nickname');
  await page.getByLabel('Your nickname').fill('Tester');
  await page.getByRole('button', { name: 'Join room →' }).click();
  await expect(page.locator('main [role=alert]')).toContainText('six-character');
});
test('appearance is accessible and persists through navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Appearance' }).click();
  await page.getByLabel('Table theme').selectOption('prism');
  await page.getByLabel('Reduce motion').check();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'prism');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.getByRole('button', { name: 'Appearance' }).click();
  await expect(page.getByLabel('Table theme')).toHaveValue('prism');
});
test('solo setup passes selected settings and name', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Solo practice →' }).click();
  await page.getByLabel('Your nickname').fill('Curious');
  await page.getByLabel('Questions', { exact: true }).selectOption('5');
  await page.getByLabel('Untimed practice').check();
  await page.getByRole('button', { name: 'Start solo practice →' }).click();
  await expect(page).toHaveURL(/\/game\/solo$/);
  await expect(page.getByRole('heading', { name: "Curious's table" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Untimed', { exact: true })).toBeVisible();
});
