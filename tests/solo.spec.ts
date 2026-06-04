import { test, expect, Page } from '@playwright/test';

/**
 * Solo game smoke tests — verifies question loading, answer selection,
 * timer behaviour, and the done screen.
 *
 * These tests run against the live Next.js + OpenTDB API.
 * They mock the /api/questions endpoint to avoid rate-limiting and ensure determinism.
 */

const MOCK_QUESTIONS = Array.from({ length: 10 }, (_, i) => ({
  category: 'General Knowledge',
  question: `Test question ${i + 1}`,
  answers: ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
  correctIndex: 0,
}));

async function interceptQuestions(page: Page) {
  await page.route('**/api/questions**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_QUESTIONS),
    });
  });
}

test.describe('Solo game', () => {
  test('loads question card after starting', async ({ page }) => {
    await interceptQuestions(page);
    await page.goto('/game/solo?name=Tester');
    // Wait for question to appear (API must resolve)
    await expect(page.getByText(/Test question 1/i)).toBeVisible({ timeout: 10_000 });
    // Timer ring should be visible (CountdownRing has aria-label="N seconds left")
    await expect(page.getByLabel(/seconds left/i)).toBeVisible();
    // Four answer buttons
    const answers = page.getByRole('button', { name: /Answer [ABCD]/i });
    await expect(answers).toHaveCount(4);
  });

  test('clicking an answer disables all buttons and shows reveal', async ({ page }) => {
    await interceptQuestions(page);
    await page.goto('/game/solo?name=Tester');
    await expect(page.getByText(/Test question 1/i)).toBeVisible({ timeout: 10_000 });

    // Click the first answer button
    await page.getByRole('button', { name: /Answer A/i }).click();

    // All answer buttons should now be disabled
    const buttons = page.locator('[class*="answerBtn"]');
    for (const btn of await buttons.all()) {
      await expect(btn).toBeDisabled();
    }
    // "Round Result" label should appear
    await expect(page.getByText(/Round Result/i)).toBeVisible({ timeout: 5_000 });
  });

  test('advances through all 10 questions and shows done screen', async ({ page }) => {
    // Each question has a 3-second reveal phase → 10 × 3s = 30s minimum.
    // Set a generous timeout so CI doesn't flake.
    test.setTimeout(90_000);
    // Shorten the reveal delay with a time override isn't possible — just click fast
    await interceptQuestions(page);
    await page.goto('/game/solo?name=Tester');

    for (let q = 0; q < 10; q++) {
      await expect(page.getByText(new RegExp(`Test question ${q + 1}`))).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: /Answer A/i }).click();
      // Wait for next question or done screen
      if (q < 9) {
        await expect(page.getByText(new RegExp(`Q ${q + 2}`))).toBeVisible({ timeout: 10_000 });
      }
    }

    await expect(page.getByText(/Well Played/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Play Again/i })).toBeVisible();
  });

  test('shows progress indicator', async ({ page }) => {
    await interceptQuestions(page);
    await page.goto('/game/solo?name=Tester');
    await expect(page.getByText(/Q 1 \/ 10/i)).toBeVisible({ timeout: 10_000 });
  });
});
