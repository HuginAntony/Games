import { gotoPrepared } from './prepare-entry';
import { test, expect } from '@playwright/test';
const questions = Array.from({ length: 5 }, (_, i) => ({ category: 'General', question: `A safe test question ${i + 1}`, answers: ['First answer', 'Second answer', 'Third answer', 'Fourth answer'], correctIndex: 0 }));
test('solo reveals for the full reading duration under reduced motion and reviews a full match', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/questions**', route => route.fulfill({ json: questions, headers: { 'X-Quiz-Source': 'opentdb' } }));
  await gotoPrepared(page, '/game/solo?name=Tester&rounds=5&untimed=1');
  await expect(page.locator('.question-title')).toHaveText(questions[0].question);
  await page.clock.install();
  for (let index = 0; index < 5; index++) {
    await expect(page.locator('.question-title')).toHaveText(questions[index].question);
    await page.getByRole('button', { name: 'Answer A: First answer', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Correct. Nicely played.');
    await expect(page.locator('.points')).toHaveText('+100');
    await page.clock.fastForward(3900);
    await expect(page.locator('.question-title')).toHaveText(questions[index].question);
    await page.clock.fastForward(200);
  }
  await expect(page.getByRole('heading', { name: 'Final standings' })).toBeVisible();
  await expect(page.getByText('500 points', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.review-list details')).toHaveCount(5);
  await page.locator('.review-list summary').first().click();
  await expect(page.getByText('Correct answer: First answer').first()).toBeVisible();
  await page.getByRole('button', { name: 'Play again →' }).click();
  await expect(page.locator('.question-title')).toHaveText(questions[0].question);
});
test('provider failure falls back to a playable local pack without injected markup', async ({ page }) => {
  await page.route('**/api/questions**', route => route.abort());
  await gotoPrepared(page, '/game/solo?name=Tester&rounds=5');
  await expect(page.locator('.question-title')).toBeVisible();
  await expect(page.getByText('Starter pack · difficulty may vary.', { exact: false })).toBeVisible();
  await expect(page.locator('.answer-card')).toHaveCount(4);
  await expect(page.locator('.answer-card').first()).toBeEnabled();
});
test('untrusted content is rendered as text', async ({ page }) => {
  await page.route('**/api/questions**', route => route.fulfill({ json: questions.map(q => ({ ...q, question: '<img src=x onerror=alert(1)>', answers: ['<script>alert(1)</script>', 'B', 'C', 'D'] })) }));
  await gotoPrepared(page, '/game/solo?rounds=5');
  await expect(page.locator('.question-title')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.quiz-table img,.quiz-table script')).toHaveCount(0);
});
