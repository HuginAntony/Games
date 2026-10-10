import { DEFAULT_SETTINGS, GameSettings } from '@/types/game';
import { validateSettings } from '@/lib/game-engine';
export function settingsFromQuery(query: { get: (key: string) => string | null }): GameSettings {
  const values: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = query.get(key);
    if (value !== null) values[key] = ['rounds', 'questionSeconds', 'revealSeconds'].includes(key) ? Number(value) : value;
  }
  try { return validateSettings(values); } catch { return { ...DEFAULT_SETTINGS }; }
}
