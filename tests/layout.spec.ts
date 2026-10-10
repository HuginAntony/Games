import { test, expect } from '@playwright/test';
import { createRoom, joinRoom, startGame, beginRound, toPublicRoom, submitAnswer, revealRound } from '../lib/game-engine';
import { getCuratedQuestions } from '../lib/questions';
import fs from 'node:fs';
test('twelve seats and long answers stay contained at phone, landscape and desktop sizes', async ({ page }) => {
  let room = createRoom('LAYOUT', 'host', 'Long host nickname', '⚡');
  for (let i = 1; i < 12; i++) room = joinRoom(room, 'p' + i, `Player ${i} long name`, '🦊');
  room = beginRound(startGame(room, getCuratedQuestions(room.settings)), Date.now());
  room.phaseEndsAt = Date.now() + 120000;
  room.questions[0] = { question: 'Which of these carefully described answers completes this long question while keeping every player’s answer card and controls readable on a small screen?', category: 'Layout validation fixture', answers: ['The first deliberately long answer option that wraps across several lines', 'Another long answer that must remain inside its own card without overlapping', 'A third answer with meaningful words and enough length to exercise wrapping', 'The fourth answer is equally long and must be fully visible when scrolled'], correctIndex: 1 };
  await page.routeWebSocket('**/parties/game/LAYOUT*', socket => {
    socket.onMessage(message => {
      const data = JSON.parse(String(message));
      if (data.type === 'answer') room = revealRound(submitAnswer(room, 'host', data.answerIndex));
      socket.send(JSON.stringify({ type: 'state-update', room: toPublicRoom(room), selfId: 'host', ownAnswer: room.players.host.answeredIndex }));
    });
  });
  await page.goto('/game/LAYOUT?name=Host');
  await expect(page.locator('.seat')).toHaveCount(12);
  fs.mkdirSync('docs/revamp/implementation', { recursive: true });
  for (const [width, height] of [[320,568],[390,844],[844,390],[768,1024],[1440,900]]) {
    await page.setViewportSize({ width, height });
    const bounds = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.answer-card')].map(element => {
        const rect = element.getBoundingClientRect();
        const text = element.querySelector('.answer-text')!.getBoundingClientRect();
        return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, textInside: text.x >= rect.x && text.right <= rect.right + 1 && text.bottom <= rect.bottom + 1 };
      });
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, cards };
    });
    expect(bounds.scrollWidth).toBeLessThanOrEqual(width);
    expect(bounds.cards.every(card => card.x >= 0 && card.right <= width + 1 && card.textInside)).toBeTruthy();
    for (let i = 0; i < bounds.cards.length; i++) for (let j = i + 1; j < bounds.cards.length; j++) {
      const a = bounds.cards[i], b = bounds.cards[j];
      expect(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y).toBeTruthy();
    }
    await page.screenshot({ path: `docs/revamp/implementation/question-${width}x${height}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addStyleTag({ content: 'html { zoom: 2; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Answer B:', exact: false }).click();
  await expect(page.locator('.answer-card.correct')).toHaveCount(1);
  await expect(page.locator('.reveal-summary')).toBeVisible();
});
test('lounge mobile controls stay contained and themes keep identical structure', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Appearance' }).click();
  for (const theme of ['midnight','prism','neon']) {
    await page.getByLabel('Table theme').selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: `docs/revamp/implementation/lounge-${theme}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Close appearance' }).click();
  await page.getByRole('button', { name: 'Host a party ↗' }).click();
  for (const [width,height] of [[320,568],[390,844],[844,390]]) {
    await page.setViewportSize({ width,height });
    const contained = await page.evaluate(() => [...document.querySelectorAll('button,input,select')].filter(element => element.getClientRects().length).every(element => { const rect = element.getBoundingClientRect(); return rect.x >= 0 && rect.right <= innerWidth + 1; }));
    expect(contained).toBeTruthy();
  }
});
