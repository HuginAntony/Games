import type { Page } from '@playwright/test';
import { DEFAULT_SETTINGS } from '../types/game';

/** Test fixtures mimic the lounge's session handoff, not a production query-string API. */
export async function gotoPrepared(page: Page, input: string) {
  const url = new URL(input, 'http://fixture.invalid');
  const query = url.searchParams;
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(settings) as (keyof typeof settings)[]) {
    const value = query.get(key);
    if (value !== null) (settings as Record<string, unknown>)[key] = ['rounds', 'questionSeconds', 'revealSeconds'].includes(key) ? Number(value) : value;
  }
  const room = url.pathname === '/game/solo' ? 'solo' : url.pathname.split('/').pop()!;
  await page.addInitScript(({ room, entry }) => sessionStorage.setItem(`wisquiz:entry:${room}`, JSON.stringify(entry)), {
    room, entry: { nickname: query.get('name') || 'Tester', avatar: query.get('avatar') || '⚡', create: query.get('host') === '1', settings, untimed: query.get('untimed') === '1' },
  });
  const clean = url.pathname + (query.get('offline') === '1' ? '?offline=1' : '');
  await page.goto(input.startsWith('https://') ? url.origin + clean : clean);
}
