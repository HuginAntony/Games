import { test, expect } from '@playwright/test';

/**
 * Home page smoke tests — verifies UI loads and navigation works correctly.
 * These tests require only the Next.js server; PartyKit is NOT needed.
 */

test.describe('Home page', () => {
  test('loads with correct title and UI elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /QuizBlitz/i })).toBeVisible();
    await expect(page.getByText(/10 questions/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Enter nickname/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Solo Play/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Room/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Join Room/i })).toBeVisible();
  });

  test('shows error when clicking Solo Play without a nickname', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Solo Play/i }).click();
    // The sub-panel appears — click "Start Solo Game" without a nickname
    await page.getByRole('button', { name: /Start Solo Game/i }).click();
    await expect(page.getByText(/Enter a nickname/i)).toBeVisible();
  });

  test('navigates to solo game after entering nickname', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Enter nickname/i).fill('TestPlayer');
    await page.getByRole('button', { name: /Solo Play/i }).click();
    await page.getByRole('button', { name: /Start Solo Game/i }).click();
    // Should navigate to /game/solo?name=TestPlayer
    await expect(page).toHaveURL(/\/game\/solo/);
  });

  test('shows room code input when Join Room is clicked', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Join Room/i }).click();
    await expect(page.getByPlaceholder(/ABCD12/i)).toBeVisible();
  });

  test('shows error when joining with invalid room code', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Enter nickname/i).fill('TestPlayer');
    await page.getByRole('button', { name: /Join Room/i }).click();
    await page.getByRole('button', { name: /Join Room/i }).last().click();
    await expect(page.getByText(/valid room code/i)).toBeVisible();
  });

  test('navigates to lobby when Create Room is clicked with a nickname', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Enter nickname/i).fill('HostPlayer');
    await page.getByRole('button', { name: /Create Room/i }).click();
    await page.getByRole('button', { name: /Create Room/i }).last().click();
    // Should navigate to /lobby/[CODE]?name=HostPlayer&host=1
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.getByText(/Waiting Room/i)).toBeVisible();
  });
});
